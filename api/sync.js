// Remote scan sync is intentionally disabled until a consent-aware encrypted backend is configured.
export default function handler(req,res){res.status(501).json({error:'Remote farmer-record sync is not configured; offline records remain only on your device.'});}
