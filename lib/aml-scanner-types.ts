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
