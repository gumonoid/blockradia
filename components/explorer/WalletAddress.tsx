'use client';
import {Copy} from 'lucide-react';
import ExchangeBadge from './ExchangeBadge';
import {getExchangeLabel} from '../../lib/exchanges';
import {displayWalletAddress,shortWalletAddress} from '../../lib/wallet-address';
import {useI18n,t} from '../../lib/i18n';

export default function WalletAddress({network,address,nickname,onOpen,onCopy}:{network:string;address?:string;nickname?:string;onOpen:(address:string)=>void;onCopy:(address:string)=>void}){
  useI18n();
  if(!address)return <span>—</span>;
  const display=displayWalletAddress(network,address);
  const label=nickname||getExchangeLabel(network,address)?.label;
  return <div className="wallet-address-cell">
    {label&&<span className="wallet-address-label"><ExchangeBadge network={network} address={address} compact/>{label}</span>}
    <div className="wallet-address-actions">
      <button className="link mono wallet-address-link" title={display} aria-label={display} onClick={()=>onOpen(address)}>{shortWalletAddress(display)}</button>
      <button className="wallet-address-copy" title={t('Скопировать адрес')} aria-label={t('Скопировать адрес')+': '+display} onClick={()=>onCopy(display)}><Copy size={12}/></button>
    </div>
  </div>;
}
