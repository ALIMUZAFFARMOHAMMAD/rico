import { languagePrompt, LANGS } from "../../lib/i18n";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbFetch(path, method="GET", body=null){
  const opts={method,headers:{"apikey":SUPABASE_KEY,"Authorization":`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json","Prefer":method==="POST"?"return=representation":"return=minimal"}};
  if(body)opts.body=JSON.stringify(body);
  const res=await fetch(`${SUPABASE_URL}/rest/v1${path}`,opts);
  const text=await res.text();
  return text?JSON.parse(text):null;
}

async function loadMemory(userId){
  if(!userId||!SUPABASE_URL||!SUPABASE_KEY)return null;
  try{
    const data=await sbFetch(`/conversations?user_id=eq.${encodeURIComponent(userId)}&select=messages,traits,riasec,voice_notes&order=updated_at.desc&limit=1`);
    if(!data||!data[0])return null;
    const row=data[0];
    const chatMsgs=(row.messages||[]).filter(m=>m.role==="user").map(m=>m.content).filter(c=>c&&!c.startsWith("[")).slice(-20);
    const voiceNotes=row.voice_notes||[];
    const traits=row.traits||{};
    const parts=[];
    if(chatMsgs.length>0)parts.push(`From past chats:\n${chatMsgs.map(m=>`- "${m}"`).join('\n')}`);
    if(voiceNotes.length>0)parts.push(`From past voice calls:\n${voiceNotes.map(n=>`- ${n}`).join('\n')}`);
    if(traits.O)parts.push(`Personality: Openness ${traits.O}%, Drive ${traits.C}%, Social ${traits.E}%, Empathy ${traits.A}%, Reflection ${traits.N}%.`);
    return parts.length>0?parts.join('\n\n'):null;
  }catch(e){console.error("loadMemory error:",e.message);return null;}
}

async function saveVoiceNotes(userId,callMessages,userName){
  if(!userId||!SUPABASE_URL||!SUPABASE_KEY)return;
  try{
    const apiKey=process.env.ANTHROPIC_API_KEY;
    const userTurns=callMessages.filter(m=>m.role==="user").map(m=>m.content).filter(c=>c&&!c.startsWith("[")).join(" | ");
    if(!userTurns)return;
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:300,system:"Extract key facts from this voice call. Return ONLY a JSON array of strings like: [\"User wants to move into AI PM\",\"User has 3 years at Wipro\"]. Max 8 items.",messages:[{role:"user",content:`Voice call: ${userTurns}`}]})});
    const d=await r.json();
    let notes=[];
    try{notes=JSON.parse(d.content[0].text.replace(/```json|```/g,"").trim());}catch(e){notes=[userTurns.substring(0,200)];}
    const existing=await sbFetch(`/conversations?user_id=eq.${encodeURIComponent(userId)}&select=id,voice_notes&limit=1`);
    if(existing&&existing[0]){
      const merged=[...(existing[0].voice_notes||[]),...notes].slice(-30);
      await sbFetch(`/conversations?user_id=eq.${encodeURIComponent(userId)}`,"PATCH",{voice_notes:merged,updated_at:new Date().toISOString()});
      console.log(`Saved ${notes.length} voice notes for ${userId.substring(0,8)}`);
    }else{
      await sbFetch("/conversations","POST",{user_id:userId,messages:[],voice_notes:notes,traits:{},riasec:"",msg_count:0});
      console.log(`Created new record with ${notes.length} voice notes`);
    }
  }catch(e){console.error("saveVoiceNotes error:",e.message);}
}

import { resolveAgent } from "../../lib/twins";

const SYSTEM=(agent,userName,memory,language)=>`${agent.persona||`You are Tony, a warm perceptive AI companion at hitony.ai`} — you are on a VOICE CALL with the user, like calling your closest friend.
${userName?`The user's name is ${userName}.`:""}
${memory?`WHAT YOU REMEMBER:\n${memory}\n\nUse this naturally like a real friend would — weave it into conversation, give specific advice based on their history.`:""}
${languagePrompt(language)}
FRIENDSHIP ONLY: you are a platonic friend; warmly redirect anything romantic.
HUMOR: Read the room FIRST — if they sound stressed, sad, or down, ZERO jokes, just be the present friend. Otherwise occasional light humor in YOUR character's style, native to the language you're speaking. Satire only about situations — never about the user or any group.
RULES: 1-3 sentences MAX. Natural casual speech. ONE question per turn. No lists or markdown. Give real specific advice. Never say "certainly" or "as an AI". Stay in character.`;

export default async function handler(req,res){
  if(req.method!=="POST")return res.status(405).end();
  const apiKey=process.env.ANTHROPIC_API_KEY;
  if(!apiKey)return res.status(500).json({error:"No API key"});
  const{messages,mode,userName,userId,callMessages,language,agentId,build}=req.body;
  const lang=LANGS[language]?language:"en";
  const agent=await resolveAgent(agentId);
  const memUserId=userId?(agent.id==="tony"?userId:`${userId}::agent::${agent.id}`):null;
  console.log(`Voice API - mode:${mode} userId:${userId?userId.substring(0,8)+"...":"NULL"}`);
  if(mode==="save_call"){
    console.log(`Saving voice call - messages:${callMessages?.length||0}`);
    if(memUserId&&callMessages&&callMessages.length>1){
      await saveVoiceNotes(memUserId,callMessages,userName);
    }
    return res.status(200).json({success:true});
  }
  const memory=memUserId?await loadMemory(memUserId):null;
  console.log(`Memory loaded: ${memory?"YES":"NO"} agent:${agent.id} build:${!!build}`);
  // "Build your twin" interview mode: a warm voice chat whose goal is to learn who the user really is.
  const BUILD_DIRECTIVE=`\n\nTWIN-BUILDING SESSION: This call exists to get to know ${userName||"this person"} deeply so an AI twin of them can be created. Warmly interview them — ask about what they love, how they talk and joke, what they care about, what kind of friend they are, a story that captures them. Go a little deeper each turn, react genuinely, ONE question at a time. Make it feel like a curious friend, never a survey. Draw out their real character and voice.`;
  const system=SYSTEM(agent,userName||"",memory,lang)+(build?BUILD_DIRECTIVE:"");
  try{
    const initMsg=build
      ?`[Start a warm get-to-know-you voice chat to learn who ${userName||"this person"} really is, for building their twin. Greet them${userName?` by name`:""}, say in one line you'd love to really get to know them, then ask your first genuine question about what makes them them. 2 sentences max.]`
      :memory&&userName
      ?`[${userName} just called. You have memory above. Pick up warmly using their name, reference ONE specific thing you remember naturally, ask one follow-up question. 2 sentences max. Sound like a real friend.]`
      :memory
      ?`[Someone called. You have memory above. Greet warmly, reference something you remember, ask a follow-up. 2 sentences max.]`
      :userName
      ?`[${userName} just called for first time. Pick up warmly using their name. 1-2 sentences, ask one question.]`
      :`[Someone called. Pick up warmly. 1-2 sentences, one question.]`;
    const msgs=mode==="init"?[{role:"user",content:initMsg}]:messages;
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":apiKey,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:150,system,messages:msgs})});
    const d=await r.json();
    return res.status(200).json({text:d.content[0].text,hasMemory:!!memory});
  }catch(e){return res.status(500).json({error:e.message});}
}
