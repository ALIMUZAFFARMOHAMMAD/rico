Ricomates product research with original MiroFish

Status: PREPARED, NOT RUN. No Zep account or compatible LLM configuration is available.
Upstream: https://github.com/666ghj/MiroFish
Pinned source: 7657031ac01184afe2cb220f5ee3545573b5e843
License: AGPL-3.0. Keep upstream license and source notices. This separate research tool is not bundled into Ricomates or represented as a certification.

Setup on the PC
1. Create a Zep account at https://app.getzep.com/ and a key for this experiment.
2. Configure an OpenAI-compatible LLM endpoint, model and key. The app's Anthropic key is not directly compatible with the original MiroFish configuration.
3. Run Prepare-MiroFish.ps1 from PowerShell. It clones the pinned original into D:\RicomatesResearch\MiroFish and creates a private local .env template. It does not start a simulation or spend API credits.
4. Fill in that .env locally; never paste keys into chat or commit it. Use only a dedicated research key, not Ricomates database/service credentials.
5. In this folder run: docker compose --project-name ricomates-research --file compose.yml up --build -d
6. Open http://localhost:3100. Ports bind only to the PC. Import seed.txt and use the experiment brief in experiment.json.
7. Set the smallest available participant/round limits before starting. Target six synthetic personas and two rounds. If the upstream interface cannot enforce those bounds, stop and adjust the experiment instead of launching an unbounded run.
8. Review the provider's cost estimate and budget before starting. Stop with: docker compose --project-name ricomates-research --file compose.yml down
   Do not add --volumes unless you intend to delete research outputs.

This is a hypothesis generator, not actual customer feedback. Do not upload account data, meeting transcripts, cloned voice recordings, real friendships, private messages or customer records. The seed is fictional. MiroFish and its LLM/Zep providers receive the seed and generated interactions.

Validate with people
Recruit five consenting adults who have never used Ricomates. Give them the four tasks in experiment.json without coaching. Observe completion, hesitation, errors and whether they understand the AI labels. Ask them to explain what their twin may share and whether it can make commitments. Use synthetic information during testing; do not request their passwords, meeting recordings or real voice clones.
Record actual observations separately from simulation predictions. Fix issues seen in two or more sessions, then retest. Test daily usefulness and user control rather than maximizing compulsive scrolling. Popularity and virality cannot be established by a simulation.

No results are claimed. A researcher must fill in the observation sheet after running actual sessions.
