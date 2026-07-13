// Marketing automation hook: submits a new Rico signup as a HubSpot form submission,
// so whatever workflow the CEO builds in HubSpot (welcome sequence, lead scoring, GTM
// funnel reporting) enrolls automatically. Uses HubSpot's public Forms API — no OAuth
// app or private-app token needed, just a portal ID + form GUID (both non-secret, the
// same identifiers HubSpot's own embed snippet uses).
// ponytail: no-op if unconfigured, same optional-integration pattern as ELEVENLABS_API_KEY.
export async function submitSignupToHubspot({ email, source }) {
  const portalId = process.env.HUBSPOT_PORTAL_ID;
  const formGuid = process.env.HUBSPOT_FORM_GUID;
  if (!portalId || !formGuid || !email) return;

  try {
    await fetch(`https://api.hsforms.com/submissions/v3/integration/submit/${portalId}/${formGuid}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: [
          { name: "email", value: email },
          ...(source ? [{ name: "rico_signup_source", value: source }] : []),
        ],
      }),
    });
  } catch (e) { /* non-fatal — marketing sync should never break signup/track */ }
}
