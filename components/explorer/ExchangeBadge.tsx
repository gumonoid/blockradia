'use client';
import {getExchangeLabel} from '../../lib/exchanges';
import {useI18n,t} from '../../lib/i18n';
export default function ExchangeBadge({network,address,compact=false}:{network:string;address?:string;compact?:boolean}){useI18n();const exchange=getExchangeLabel(network,address);if(!exchange)return null;return <span className="exchange-badge" title={exchange.label+' · '+t('Публичная метка')+' · '+exchange.source+' · '+exchange.checkedAt}><img src={exchange.logo} alt={exchange.name} width={18} height={18}/>{!compact&&<span>{exchange.name}</span>}</span>}
