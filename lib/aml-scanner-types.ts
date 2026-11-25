export type ScannerFinding = {code:string;label:string;kind:'risk'|'label';attribution?:string};
export type ScannerSource = {
 id:string;name:string;url:string;status:'ok'|'partial'|'unavailable'|'not_configured'|'unsupported';
 checkedAt:string|null;checks:number;totalChecks:number;findings:ScannerFinding[];
};
export type ScannerFeed = {network:string;address:string;checkedAt:string;sources:ScannerSource[]};

export const securityFlags = [
 'phishing_activities','stealing_attack','blackmail_activities','money_laundering',
 'sanctioned','mixer','blacklist_doubt','honeypot_related_address','cybercrime',
 'financial_crime','darkweb_transactions','fake_kyc','malicious_mining_activities',
 'gas_abuse','reinit','fake_standard_interface','fake_token',
] as const;

export const chains:Record<string,string>={ethereum:'1',base:'8453',arbitrum:'42161',optimism:'10',polygon:'137',tron:'tron'};
export const explorers:Record<string,string>={ethereum:'eth.blockscout.com',base:'base.blockscout.com',arbitrum:'arbitrum.blockscout.com',optimism:'optimism.blockscout.com',polygon:'polygon.blockscout.com'};
