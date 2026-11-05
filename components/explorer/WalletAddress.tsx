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
  const focus=()=>window.dispatchEvent(new CustomEvent('blockradia-wallet-focus',{detail:{network,address}}));
  const clear=()=>window.dispatchEvent(new CustomEvent('blockradia-wallet-focus',{detail:null}));
  return <div className="wallet-address-cell" data-wallet={address} onMouseEnter={focus} onMouseLeave={clear} onFocus={focus} onBlur={clear}>
    {label&&<span className="wallet-address-label"><ExchangeBadge network={network} address={address} compact/>{label}</span>}
    <div className="wallet-hovercard" role="tooltip"><strong>{label||network.toUpperCase()}</strong><code>{display}</code></div><div className="wallet-address-actions">
      <button className="link mono wallet-address-link" title={display} aria-label={display} onClick={()=>onOpen(address)}>{shortWalletAddress(display)}</button>
      <button className="wallet-address-copy" title={t('Скопировать адрес')} aria-label={t('Скопировать адрес')+': '+display} onClick={()=>onCopy(display)}><Copy size={12}/></button>
    </div>
  </div>;
}
