/**
 * The id of the deployment serving this code. Vercel sets VERCEL_DEPLOYMENT_ID at runtime, one value per
 * deploy and the same on every instance. Anywhere else (dev, a local or CI build) there is no deploy to
 * tell apart, so the id is a constant and nothing ever reads as "new version".
 */
export function buildVersion(): string {
  return process.env.VERCEL_DEPLOYMENT_ID || process.env.NEXT_DEPLOYMENT_ID || 'dev';
}
