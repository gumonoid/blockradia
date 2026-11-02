'use client';
import {useSyncExternalStore} from 'react';
export type Language='ru'|'en'|'zh';
const messages:Record<string,{en:string;zh:string}>={
  "Светлая": {
    "en": "Light",
    "zh": "浅色"
  },
  "Тёмная": {
    "en": "Dark",
    "zh": "深色"
  },
  "Чёрная": {
    "en": "Black",
    "zh": "纯黑"
  },
  "Тёмно-зелёная": {
    "en": "Dark green",
    "zh": "深绿色"
  },
  "Тёмно-рубиновая": {
    "en": "Dark ruby",
    "zh": "深红色"
  },
  "Кремовая": {
    "en": "Cream",
    "zh": "奶油色"
  },
  "Серая": {
    "en": "Gray",
    "zh": "灰色"
  },
  "Обзор": {
    "en": "Overview",
    "zh": "概览"
  },
  "Транзакции": {
    "en": "Transactions",
    "zh": "交易"
  },
  "Все операции": {
    "en": "All operations",
    "zh": "所有操作"
  },
  "Блоки": {
    "en": "Blocks",
    "zh": "区块"
  },
  "Избранное": {
    "en": "Bookmarks",
    "zh": "收藏"
  },
  "История": {
    "en": "History",
    "zh": "历史记录"
  },
  "Успешные": {
    "en": "Successful",
    "zh": "成功"
  },
  "7Д": {
    "en": "7D",
    "zh": "7天"
  },
  "14Д": {
    "en": "14D",
    "zh": "14天"
  },
  "30Д": {
    "en": "30D",
    "zh": "30天"
  },
  "Не удалось сохранить данные на диск": {
    "en": "Could not save data locally",
    "zh": "无法在本地保存数据"
  },
  "Никнейм сохранён": {
    "en": "Nickname saved",
    "zh": "昵称已保存"
  },
  "Загрузка истории отменена. Можно повторить.": {
    "en": "History loading cancelled. You can retry.",
    "zh": "历史记录加载已取消，可重试。"
  },
  "Загрузка истории отменена. Баланс сохранён; связи ещё не получены.": {
    "en": "History cancelled. Balance retained; connections not loaded.",
    "zh": "历史记录已取消。余额已保留，关联尚未加载。"
  },
  "История загружена не полностью.": {
    "en": "History is incomplete.",
    "zh": "历史记录不完整。"
  },
  "Получаем баланс кошелька": {
    "en": "Fetching wallet balance",
    "zh": "正在获取钱包余额"
  },
  "Получаем транзакцию": {
    "en": "Fetching transaction",
    "zh": "正在获取交易"
  },
  "Баланс временно недоступен. Загружаем историю независимо от баланса.": {
    "en": "Balance unavailable. Loading history independently.",
    "zh": "余额暂不可用，正在单独加载历史记录。"
  },
  "Загружаем историю переводов из сети…": {
    "en": "Loading on-chain transfer history…",
    "zh": "正在加载链上转账历史…"
  },
  "Баланс получен. Загружаем историю и связи": {
    "en": "Balance loaded. Fetching history and connections",
    "zh": "余额已加载，正在获取历史记录和关联"
  },
  "Баланс получен. История временно недоступна; отсутствие связей не означает отсутствие переводов.": {
    "en": "Balance loaded. History unavailable; missing connections do not mean no transfers.",
    "zh": "余额已加载。历史记录暂不可用；没有显示关联并不代表没有转账。"
  },
  "Избранное обновлено": {
    "en": "Bookmarks updated",
    "zh": "收藏已更新"
  },
  "Скопировано": {
    "en": "Copied",
    "zh": "已复制"
  },
  "Копирование недоступно в этом браузере": {
    "en": "Copying is unavailable in this browser",
    "zh": "此浏览器不支持复制"
  },
  "Нет транзакций для экспорта": {
    "en": "No transactions to export",
    "zh": "没有可导出的交易"
  },
  "Все сети. Один взгляд.": {
    "en": "All networks. One view.",
    "zh": "所有网络，一览无余。"
  },
  "РАБОЧЕЕ ПРОСТРАНСТВО": {
    "en": "WORKSPACE",
    "zh": "工作空间"
  },
  "СЕТИ": {
    "en": "NETWORKS",
    "zh": "网络"
  },
  "Исследуйте уверенно": {
    "en": "Explore with confidence",
    "zh": "安心探索"
  },
  "Данные из публичных источников. Без подключения кошелька.": {
    "en": "Public data. No wallet connection required.",
    "zh": "使用公开数据，无需连接钱包。"
  },
  "Об источниках": {
    "en": "About data sources",
    "zh": "关于数据源"
  },
  "Настройки и данные": {
    "en": "Settings & data",
    "zh": "设置与数据"
  },
  "Открыть меню": {
    "en": "Open menu",
    "zh": "打开菜单"
  },
  "Основная сеть": {
    "en": "Mainnet",
    "zh": "主网"
  },
  "Информация": {
    "en": "Information",
    "zh": "信息"
  },
  "Открыть избранное": {
    "en": "Open bookmarks",
    "zh": "打开收藏"
  },
  "Блокчейн без границ": {
    "en": "Blockchain without borders",
    "zh": "无界区块链"
  },
  "Исследуйте сети, отслеживайте транзакции и находите ответы.": {
    "en": "Explore networks, trace transactions, and find answers.",
    "zh": "探索网络、追踪交易、寻找答案。"
  },
  "Подключение…": {
    "en": "Connecting…",
    "zh": "连接中…"
  },
  "Есть ошибки API": {
    "en": "API errors",
    "zh": "API 错误"
  },
  "Данные из интернета": {
    "en": "Live internet data",
    "zh": "实时网络数据"
  },
  "Адрес или хеш транзакции": {
    "en": "Address or transaction hash",
    "zh": "地址或交易哈希"
  },
  "Поиск по адресу или хешу транзакции": {
    "en": "Search by address or transaction hash",
    "zh": "按地址或交易哈希搜索"
  },
  "Сеть поиска": {
    "en": "Search network",
    "zh": "搜索网络"
  },
  "Найти адрес или транзакцию": {
    "en": "Find address or transaction",
    "zh": "查找地址或交易"
  },
  "Попробуйте:": {
    "en": "Try:",
    "zh": "试一试："
  },
  "Только чтение. Кошелёк не нужен.": {
    "en": "Read-only. No wallet needed.",
    "zh": "只读，无需钱包。"
  },
  "Расширенный анализ Solana": {
    "en": "Extended Solana analysis",
    "zh": "Solana 深度分析"
  },
  "До 60 транзакций с переводами SOL и SPL. Данные появляются по мере загрузки. Анализ может занять несколько минут.": {
    "en": "Up to 60 transactions with SOL and SPL transfers. Results appear as they load. Analysis may take several minutes.",
    "zh": "分析最多 60 笔包含 SOL 和 SPL 转账的交易。结果随加载逐步显示，可能需要几分钟。"
  },
  "Расширенный поиск занимает больше времени: расшифровываем транзакции Solana. Уже полученные связи остаются на графе.": {
    "en": "Extended search takes longer while decoding Solana transactions. Loaded connections remain on the graph.",
    "zh": "解析 Solana 交易需要更长时间，已加载的关联会保留在图中。"
  },
  "сек. · ожидание ограничено; при сбое можно повторить запрос": {
    "en": "sec · requests have a time limit; retry if needed",
    "zh": "秒 · 请求有时间限制，失败后可重试"
  },
  "Отменить": {
    "en": "Cancel",
    "zh": "取消"
  },
  "Повторить загрузку истории": {
    "en": "Retry history",
    "zh": "重新加载历史记录"
  },
  "Не удалось получить данные": {
    "en": "Could not fetch data",
    "zh": "无法获取数据"
  },
  ". Попробуйте ещё раз или выберите другую сеть.": {
    "en": ". Try again or choose another network.",
    "zh": "。请重试或选择其他网络。"
  },
  "Повторить поиск": {
    "en": "Retry search",
    "zh": "重新搜索"
  },
  "Скрыть ошибку": {
    "en": "Dismiss error",
    "zh": "关闭错误提示"
  },
  "Обзор адреса": {
    "en": "Address overview",
    "zh": "地址概览"
  },
  "Детали транзакции": {
    "en": "Transaction details",
    "zh": "交易详情"
  },
  "Закрыть результат": {
    "en": "Close result",
    "zh": "关闭结果"
  },
  "Скопировать": {
    "en": "Copy",
    "zh": "复制"
  },
  "В избранное": {
    "en": "Bookmark",
    "zh": "收藏"
  },
  "Баланс": {
    "en": "Balance",
    "zh": "余额"
  },
  "Статус": {
    "en": "Status",
    "zh": "状态"
  },
  "Тип адреса": {
    "en": "Address type",
    "zh": "地址类型"
  },
  "Блок": {
    "en": "Block",
    "zh": "区块"
  },
  "Уточняется": {
    "en": "Unknown",
    "zh": "待确认"
  },
  "Смарт-контракт": {
    "en": "Smart contract",
    "zh": "智能合约"
  },
  "Аккаунт": {
    "en": "Account",
    "zh": "账户"
  },
  "Транзакции в ответе": {
    "en": "Transactions returned",
    "zh": "返回的交易"
  },
  "Сумма": {
    "en": "Amount",
    "zh": "金额"
  },
  "Загружаем…": {
    "en": "Loading…",
    "zh": "加载中…"
  },
  "Открыть в обозревателе": {
    "en": "Open in explorer",
    "zh": "在浏览器中查看"
  },
  "Сохранённые адреса и транзакции": {
    "en": "Saved addresses and transactions",
    "zh": "已保存的地址和交易"
  },
  "Важное всегда под рукой": {
    "en": "Keep important addresses close",
    "zh": "重要地址随时可查"
  },
  "Найдите адрес или транзакцию и нажмите ☆, чтобы сохранить.": {
    "en": "Find an address or transaction and press ☆ to save it.",
    "zh": "查找地址或交易，点击 ☆ 保存。"
  },
  "Избранное хранится только в этом браузере.": {
    "en": "Bookmarks are stored locally in this browser.",
    "zh": "收藏仅保存在此浏览器中。"
  },
  "Открыть": {
    "en": "Open",
    "zh": "打开"
  },
  "Удалить": {
    "en": "Delete",
    "zh": "删除"
  },
  "Недоступна": {
    "en": "Unavailable",
    "zh": "不可用"
  },
  "Рыночные данные из интернета": {
    "en": "Live market data",
    "zh": "实时市场数据"
  },
  "Всего транзакций": {
    "en": "Total transactions",
    "zh": "交易总数"
  },
  "Операции в выборке": {
    "en": "Sample operations",
    "zh": "样本操作"
  },
  "За всё время": {
    "en": "All time",
    "zh": "全部时间"
  },
  "Реальные операции источника": {
    "en": "Actual source operations",
    "zh": "数据源的真实操作"
  },
  "Текущий слот": {
    "en": "Current slot",
    "zh": "当前时隙"
  },
  "Последний блок": {
    "en": "Latest block",
    "zh": "最新区块"
  },
  "Адресов в сети": {
    "en": "Network addresses",
    "zh": "网络地址数"
  },
  "Участники выборки": {
    "en": "Sample participants",
    "zh": "样本参与者"
  },
  "Проиндексированные адреса": {
    "en": "Indexed addresses",
    "zh": "已索引地址"
  },
  "Уникальные отправители и получатели": {
    "en": "Unique senders and recipients",
    "zh": "唯一发送方和接收方"
  },
  "Цена": {
    "en": "Price",
    "zh": "价格"
  },
  "Активность сети": {
    "en": "Network activity",
    "zh": "网络活动"
  },
  "Исторические котировки · DefiLlama": {
    "en": "Historical prices · DefiLlama",
    "zh": "历史价格 · DefiLlama"
  },
  "Операции из API сети": {
    "en": "Operations from network API",
    "zh": "网络 API 操作"
  },
  "Активность": {
    "en": "Activity",
    "zh": "活动"
  },
  "График цены из интернета": {
    "en": "Live price chart",
    "zh": "实时价格图表"
  },
  "График реальной активности": {
    "en": "On-chain activity chart",
    "zh": "链上活动图表"
  },
  "Загружаем данные из интернета…": {
    "en": "Fetching live data…",
    "zh": "正在获取实时数据…"
  },
  "В источнике пока нет данных для графика": {
    "en": "No chart data available from this source",
    "zh": "此数据源暂无图表数据"
  },
  "Цена в USD": {
    "en": "Price in USD",
    "zh": "美元价格"
  },
  "DefiLlama · реальные котировки": {
    "en": "DefiLlama · actual prices",
    "zh": "DefiLlama · 真实价格"
  },
  "Публичный API": {
    "en": "Public API",
    "zh": "公开 API"
  },
  "ВЫ ИССЛЕДУЕТЕ": {
    "en": "EXPLORING",
    "zh": "正在探索"
  },
  "Газ, средняя цена": {
    "en": "Average gas price",
    "zh": "平均 Gas 价格"
  },
  "Источник данных": {
    "en": "Data source",
    "zh": "数据源"
  },
  "Официальный обозреватель": {
    "en": "Official explorer",
    "zh": "官方区块浏览器"
  },
  "Крупные переводы": {
    "en": "Large transfers",
    "zh": "大额转账"
  },
  "Обновить данные": {
    "en": "Refresh data",
    "zh": "刷新数据"
  },
  "Фильтр транзакций": {
    "en": "Transaction filter",
    "zh": "交易筛选"
  },
  "Ошибки": {
    "en": "Failed",
    "zh": "失败"
  },
  "Транзакций в выборке": {
    "en": "Sample transactions",
    "zh": "样本交易数"
  },
  "Сеть": {
    "en": "Network",
    "zh": "网络"
  },
  "Источник": {
    "en": "Source",
    "zh": "来源"
  },
  "Хеш транзакции": {
    "en": "Transaction hash",
    "zh": "交易哈希"
  },
  "Метод": {
    "en": "Method",
    "zh": "方法"
  },
  "Отправитель": {
    "en": "Sender",
    "zh": "发送方"
  },
  "Получатель": {
    "en": "Recipient",
    "zh": "接收方"
  },
  "Скопировать хеш": {
    "en": "Copy hash",
    "zh": "复制哈希"
  },
  "Успешно": {
    "en": "Success",
    "zh": "成功"
  },
  "В блоке": {
    "en": "Confirmed",
    "zh": "已确认"
  },
  "Неизвестно": {
    "en": "Unknown",
    "zh": "未知"
  },
  "Получаем данные блокчейна…": {
    "en": "Fetching blockchain data…",
    "zh": "正在获取区块链数据…"
  },
  "История не получена. Повторите загрузку.": {
    "en": "History unavailable. Please retry.",
    "zh": "未获取历史记录，请重试。"
  },
  "Найдите адрес Solana, чтобы увидеть историю операций.": {
    "en": "Search a Solana address to view its history.",
    "zh": "搜索 Solana 地址以查看历史记录。"
  },
  "Нет доступных транзакций в этой выборке.": {
    "en": "No transactions available in this sample.",
    "zh": "此样本中暂无交易。"
  },
  "Исследовать пример адреса": {
    "en": "Explore sample address",
    "zh": "探索示例地址"
  },
  "Нет операций с выбранным статусом.": {
    "en": "No operations match the selected status.",
    "zh": "没有符合所选状态的操作。"
  },
  "Блоки из загруженной выборки": {
    "en": "Blocks in loaded sample",
    "zh": "已加载样本中的区块"
  },
  "Предыдущая страница": {
    "en": "Previous page",
    "zh": "上一页"
  },
  "Следующая страница": {
    "en": "Next page",
    "zh": "下一页"
  },
  "Блокчейн становится понятнее.": {
    "en": "Making blockchain easier to understand.",
    "zh": "让区块链更易理解。"
  },
  "Источники и ограничения": {
    "en": "Sources & limitations",
    "zh": "来源与限制"
  },
  "Настройки и источники": {
    "en": "Settings & sources",
    "zh": "设置与数据源"
  },
  "Закрыть": {
    "en": "Close",
    "zh": "关闭"
  },
  "BlockRadia читает публичные сети. Подпись и подключение кошелька не требуются.": {
    "en": "BlockRadia reads public networks. No signature or wallet connection required.",
    "zh": "BlockRadia 读取公开网络，无需签名或连接钱包。"
  },
  "Тема оформления": {
    "en": "Appearance",
    "zh": "外观主题"
  },
  "Автообновление": {
    "en": "Auto-refresh",
    "zh": "自动刷新"
  },
  "Раз в 60 секунд, пока страница открыта": {
    "en": "Every 60 seconds while the page is open",
    "zh": "页面打开时每 60 秒刷新一次"
  },
  "Интернет-источники": {
    "en": "Online sources",
    "zh": "在线数据源"
  },
  "Цены и история цены — DefiLlama Coins. EVM — Blockscout / публичные RPC; TRON — TronGrid; Solana — Mainnet RPC; TON — TON Center v3.": {
    "en": "Prices and price history: DefiLlama Coins. EVM: Blockscout / public RPC; TRON: TronGrid; Solana: Mainnet RPC / PublicNode; TON: TON Center v3.",
    "zh": "价格及历史价格：DefiLlama Coins。EVM：Blockscout / 公开 RPC；TRON：TronGrid；Solana：Mainnet RPC / PublicNode；TON：TON Center v3。"
  },
  "История и граф используют реальные переводы, возвращённые источниками. Объём выборки указан под графом. Никнеймы — ваши локальные подписи, а не установленные владельцы. Граф не доказывает связь между владельцами кошельков.": {
    "en": "History and graphs use actual transfers returned by sources. Sample size appears below the graph. Nicknames are your local labels, not verified identities. The graph does not prove links between wallet owners.",
    "zh": "历史记录和关系图使用数据源返回的真实转账。样本范围显示在图下方。昵称是本地标签，不代表已验证身份。关系图不能证明钱包所有者之间的关联。"
  },
  "При сбое одного источника другие данные продолжают загружаться. Демонстрационные данные отключены. Публичные API могут ограничивать частоту запросов.": {
    "en": "If one source fails, other data continues loading. No demo data is used. Public APIs may enforce rate limits.",
    "zh": "单个数据源出错时，其他数据仍继续加载。不使用演示数据。公开 API 可能限制请求频率。"
  },
  "Готово": {
    "en": "Done",
    "zh": "完成"
  },
  "Источник не вернул переводов для этого узла. Отсутствие связей в выборке не означает отсутствие истории.": {
    "en": "No transfers returned for this node. Missing sample connections do not mean no history.",
    "zh": "数据源未返回此节点的转账。样本中没有关联并不意味着没有历史记录。"
  },
  "Граф связей кошелька": {
    "en": "Wallet relationship graph",
    "zh": "钱包关系图"
  },
  "узлов ·": {
    "en": "nodes ·",
    "zh": "个节点 ·"
  },
  "связей": {
    "en": "connections",
    "zh": "条关联"
  },
  "Тип переводов графа": {
    "en": "Graph transfer type",
    "zh": "图中转账类型"
  },
  "Все переводы": {
    "en": "All transfers",
    "zh": "所有转账"
  },
  "Нативная монета": {
    "en": "Native coin",
    "zh": "原生代币"
  },
  "Токены": {
    "en": "Tokens",
    "zh": "代币"
  },
  "Экспорт графа JSON": {
    "en": "Export graph as JSON",
    "zh": "导出关系图 JSON"
  },
  "Полный экран": {
    "en": "Fullscreen",
    "zh": "全屏"
  },
  "Реальные переводы ·": {
    "en": "Actual transfers ·",
    "zh": "真实转账 ·"
  },
  "Выборка, не полная история": {
    "en": "Sample, not full history",
    "zh": "样本，非完整历史记录"
  },
  "Интерактивный граф переводов кошелька": {
    "en": "Interactive wallet transfer graph",
    "zh": "交互式钱包转账关系图"
  },
  "Исходный кошелёк": {
    "en": "Root wallet",
    "zh": "起始钱包"
  },
  "Загружаем реальные связи…": {
    "en": "Loading actual connections…",
    "zh": "正在加载真实关联…"
  },
  "Не удалось расшифровать историю": {
    "en": "Could not decode history",
    "zh": "无法解析历史记录"
  },
  "В этой выборке нет распознанных переводов": {
    "en": "No recognized transfers in this sample",
    "zh": "此样本中没有可识别的转账"
  },
  "Источник не вернул историю": {
    "en": "Source returned no history",
    "zh": "数据源未返回历史记录"
  },
  "Баланс уже получен. Загрузка истории ограничена по времени.": {
    "en": "Balance loaded. History requests have a time limit.",
    "zh": "余额已加载，历史记录请求有时间限制。"
  },
  "Используйте кнопку повторной загрузки истории.": {
    "en": "Use the retry history button.",
    "zh": "请点击重新加载历史记录。"
  },
  "Это не означает, что у кошелька нет транзакций. Попробуйте повторную загрузку истории.": {
    "en": "This does not mean the wallet has no transactions. Retry loading history.",
    "zh": "这不代表钱包没有交易，请重新加载历史记录。"
  },
  "Уменьшить граф": {
    "en": "Zoom out",
    "zh": "缩小"
  },
  "Увеличить граф": {
    "en": "Zoom in",
    "zh": "放大"
  },
  "Вписать": {
    "en": "Fit",
    "zh": "适应画面"
  },
  "Исходный": {
    "en": "Root",
    "zh": "起始"
  },
  "СВЯЗЬ / ПЕРЕВОДЫ": {
    "en": "CONNECTION / TRANSFERS",
    "zh": "关联 / 转账"
  },
  "переводов в загруженной выборке. Нажмите на хеш для просмотра в обозревателе.": {
    "en": "transfers in the loaded sample. Click a hash to open the explorer.",
    "zh": "笔转账位于已加载样本中，点击哈希可在浏览器查看。"
  },
  "Время не получено от RPC": {
    "en": "Time unavailable from RPC",
    "zh": "RPC 未返回时间"
  },
  "Вернуться к узлу": {
    "en": "Back to node",
    "zh": "返回节点"
  },
  "ВЫБРАННЫЙ КОШЕЛЁК": {
    "en": "SELECTED WALLET",
    "zh": "所选钱包"
  },
  "Копирование недоступно": {
    "en": "Copying unavailable",
    "zh": "无法复制"
  },
  "Скопировать адрес": {
    "en": "Copy address",
    "zh": "复制地址"
  },
  "Мой никнейм": {
    "en": "My nickname",
    "zh": "我的昵称"
  },
  "Никнейм выбранного кошелька": {
    "en": "Selected wallet nickname",
    "zh": "所选钱包昵称"
  },
  "Например, Биржа / Основной": {
    "en": "e.g. Exchange / Main",
    "zh": "例如：交易所 / 主钱包"
  },
  "Сохранить никнейм": {
    "en": "Save nickname",
    "zh": "保存昵称"
  },
  "Входящие связи": {
    "en": "Incoming connections",
    "zh": "转入关联"
  },
  "Исходящие связи": {
    "en": "Outgoing connections",
    "zh": "转出关联"
  },
  "Загрузка из сети…": {
    "en": "Loading from network…",
    "zh": "正在从网络加载…"
  },
  "Связи загружены": {
    "en": "Connections loaded",
    "zh": "关联已加载"
  },
  "Раскрыть связи кошелька": {
    "en": "Expand wallet connections",
    "zh": "展开钱包关联"
  },
  "Раскрытие узла отменено.": {
    "en": "Node expansion cancelled.",
    "zh": "节点展开已取消。"
  },
  "Отменить загрузку узла": {
    "en": "Cancel node loading",
    "zh": "取消节点加载"
  },
  "Перетаскивайте узлы и фон. Выберите узел и раскройте его связи. Нажмите на линию, чтобы увидеть переводы.": {
    "en": "Drag nodes and the background. Select a node to expand its connections. Click a line to inspect transfers.",
    "zh": "拖动节点和背景。选择节点以展开关联，点击连线查看转账。"
  },
  "Только переводы, возвращённые публичным API.": {
    "en": "Only transfers returned by the public API.",
    "zh": "仅显示公开 API 返回的转账。"
  },
  "Достигнут лимит 180 узлов.": {
    "en": "180-node limit reached.",
    "zh": "已达到 180 个节点上限。"
  },
  "Скрыть сообщение графа": {
    "en": "Dismiss graph message",
    "zh": "关闭图表提示"
  },
  "История исследований": {
    "en": "Research history",
    "zh": "研究历史"
  },
  "Адреса и транзакции, которые вы открывали. Никнеймы видны в графе и таблицах.": {
    "en": "Addresses and transactions you opened. Nicknames appear in graphs and tables.",
    "zh": "您查看过的地址和交易。昵称会显示在关系图和表格中。"
  },
  "Экспорт JSON": {
    "en": "Export JSON",
    "zh": "导出 JSON"
  },
  "Поиск в истории": {
    "en": "Search history",
    "zh": "搜索历史记录"
  },
  "Адрес, никнейм или сеть": {
    "en": "Address, nickname, or network",
    "zh": "地址、昵称或网络"
  },
  "Ничего не найдено": {
    "en": "Nothing found",
    "zh": "未找到结果"
  },
  "История пока пуста": {
    "en": "No history yet",
    "zh": "暂无历史记录"
  },
  "Выполните поиск кошелька или раскройте узел графа — запись появится здесь.": {
    "en": "Search a wallet or expand a graph node to add a history entry.",
    "zh": "搜索钱包或展开图节点后，记录将显示在此处。"
  },
  "Кошелёк": {
    "en": "Wallet",
    "zh": "钱包"
  },
  "Транзакция": {
    "en": "Transaction",
    "zh": "交易"
  },
  "· Открытий:": {
    "en": "· Visits:",
    "zh": "· 查看次数："
  },
  "Добавить никнейм": {
    "en": "Add nickname",
    "zh": "添加昵称"
  },
  "История и ваши никнеймы сохраняются локально на этом компьютере. Это ваши метки, не подтверждённая идентификация владельцев.": {
    "en": "History and nicknames are stored locally on this computer. They are your labels, not verified owner identities.",
    "zh": "历史记录和昵称保存在本机。这些是您的标签，并非已验证的所有者身份。"
  },
  "Язык интерфейса": {
    "en": "Interface language",
    "zh": "界面语言"
  },
  "Исследуйте": {
    "en": "Explore",
    "zh": "探索"
  },
  "с BlockRadia.": {
    "en": "with BlockRadia.",
    "zh": "使用 BlockRadia。"
  },
  "Расширенный анализ: получено": {
    "en": "Extended analysis: loaded",
    "zh": "深度分析：已加载"
  },
  "транзакций, загружаем следующую страницу": {
    "en": "transactions, loading next page",
    "zh": "笔交易，正在加载下一页"
  }
};
Object.assign(messages,{"Blockchain Explorer":{"en":"Blockchain Explorer","zh":"区块链浏览器"},"MULTICHAIN EXPLORER":{"en":"MULTICHAIN EXPLORER","zh":"多链浏览器"},"ON-CHAIN INVESTIGATION":{"en":"ON-CHAIN INVESTIGATION","zh":"链上调查"},"Mainnet":{"en":"Mainnet","zh":"主网"},"Не удалось расшифровать":{"en":"Could not decode","zh":"无法解析"},"транзакций из-за ограничений RPC. Граф неполный.":{"en":"transactions due to RPC limits. The graph is incomplete.","zh":"笔交易因 RPC 限制无法解析。关系图不完整。"},"транзакций в выборке.":{"en":"transactions in the sample.","zh":"笔交易位于样本中。"},"Проверено":{"en":"Checked","zh":"已检查"},"подписей на этой странице. SOL и SPL, включая внутренние инструкции.":{"en":"signatures on this page. SOL and SPL, including inner instructions.","zh":"个本页签名。包含 SOL、SPL 及内部指令。"},"Расширенный анализ всех переводов в транзакциях.":{"en":"Extended analysis of all transfers within transactions.","zh":"深度分析交易内的所有转账。"}});
Object.assign(messages,{"Лента индексатора временно недоступна. Показаны операции последнего блока из резервного RPC.":{"en":"The indexer transaction feed is temporarily unavailable. Showing latest-block operations from the fallback RPC.","zh":"索引器交易列表暂不可用，显示备用 RPC 返回的最新区块操作。"},"Общая статистика источника временно недоступна.":{"en":"Network-wide source statistics are temporarily unavailable.","zh":"数据源的全网统计暂不可用。"},"Показана последняя успешная статистика сети (не старше 5 минут).":{"en":"Showing the last successful network statistics (up to 5 minutes old).","zh":"显示最近成功获取的全网统计（不超过5分钟）。"},"Показан последний успешный график сети (не старше 5 минут).":{"en":"Showing the last successful network chart (up to 5 minutes old).","zh":"显示最近成功获取的网络图表（不超过5分钟）。"},"График построен по загруженной выборке, а не по всей сети.":{"en":"This chart covers the loaded sample rather than the whole network.","zh":"此图表仅反映已加载的样本，并非整个网络。"}});
Object.assign(messages,{"Лента транзакций временно недоступна. Другие доступные данные сохранены.":{"en":"The transaction feed is temporarily unavailable. Other available data has been preserved.","zh":"交易列表暂不可用，其他可用数据已保留。"},"ERC-20: переводы с неизвестной точностью токена пропущены.":{"en":"ERC-20 transfers with unknown token precision were omitted.","zh":"已跳过精度未知的 ERC-20 转账。"},"Текущая цена недоступна; показана последняя точка исторического ряда.":{"en":"The current price is unavailable; showing the last historical price point.","zh":"当前价格不可用，显示最近的历史价格。"}});
Object.assign(messages,{"Источник метки":{"en":"Label source","zh":"标签来源"},"Публичная метка":{"en":"Public label","zh":"公开标签"}});
Object.assign(messages,{"История TRON временно недоступна. Баланс сохранён; повторите загрузку истории.":{"en":"TRON history is temporarily unavailable. Balance retained; retry loading history.","zh":"TRON 历史记录暂不可用。余额已保留，请重试。"},"Баланс TRON временно недоступен; показана доступная история.":{"en":"TRON balance is temporarily unavailable; showing available history.","zh":"TRON 余额暂不可用，显示可用历史记录。"},"Баланс TRON получен из резервного RPC.":{"en":"TRON balance was obtained from the fallback RPC.","zh":"TRON 余额来自备用 RPC。"},"Источники TRON временно недоступны. Повторите загрузку.":{"en":"TRON sources are temporarily unavailable. Please retry.","zh":"TRON 数据源暂不可用，请重试。"},"TRX история недоступна":{"en":"TRX history unavailable","zh":"TRX 历史记录不可用"},"TRC-20 история недоступна":{"en":"TRC-20 history unavailable","zh":"TRC-20 历史记录不可用"}});
Object.assign(messages,{"Сумма и дата переводов":{"en":"Transfer amounts & dates","zh":"转账金额与日期"},"Входящий":{"en":"Incoming","zh":"转入"},"Исходящий":{"en":"Outgoing","zh":"转出"},"Себе":{"en":"Self-transfer","zh":"自转账"},"Дата не получена от источника":{"en":"Date unavailable from source","zh":"数据源未提供日期"},"Показать ещё":{"en":"Show more","zh":"显示更多"},"Нет переводов в загруженной выборке.":{"en":"No transfers in the loaded sample.","zh":"已加载样本中没有转账。"}});
Object.assign(messages,{"Часть истории временно недоступна. Повторите загрузку.":{"en":"Part of the history is temporarily unavailable. Please retry.","zh":"部分历史记录暂不可用，请重试。"},"TRC-20 история недоступна. Повторите загрузку истории.":{"en":"TRC-20 history is unavailable. Retry loading history.","zh":"TRC-20 历史记录不可用，请重新加载。"},"TRC-20: после сбоя загружена сокращённая страница (до 20 переводов).":{"en":"TRC-20: after a source error, a smaller page was loaded (up to 20 transfers).","zh":"TRC-20：数据源出错后已加载较小页面（最多20笔转账）。"},"TRX: после сбоя загружена сокращённая страница (до 20 операций).":{"en":"TRX: after a source error, a smaller page was loaded (up to 20 operations).","zh":"TRX：数据源出错后已加载较小页面（最多20笔操作）。"}});
Object.assign(messages,{"Повторно загружаем пропущенные транзакции":{"en":"Retrying missing transactions","zh":"正在重试缺失的交易"}});
let language:Language='ru';
try{const saved=typeof localStorage!=='undefined'?localStorage.getItem('blockradia-language'):null;if(saved==='en'||saved==='zh')language=saved;}catch{}
const listeners=new Set<()=>void>();
export function setLanguage(value:Language){language=value;try{localStorage.setItem('blockradia-language',value)}catch{}if(typeof document!=='undefined')document.documentElement.lang=value==='zh'?'zh-CN':value;listeners.forEach(fn=>fn());}
export function getLocale(){return language==='zh'?'zh-CN':language==='en'?'en-US':'ru-RU'}
Object.assign(messages,{'Индексатор ограничил API-доступ. Для полной статистики нужен ключ Blockscout с доступом к этой сети.':{en:'The indexer restricted API access. Full statistics require a Blockscout key with access to this network.',zh:'索引器限制了 API 访问。完整统计需要具有该网络访问权限的 Blockscout 密钥。'},'Показана выборка последних блоков из RPC.':{en:'Showing a sample of recent blocks from RPC.',zh:'显示通过 RPC 加载的最近区块样本。'}});
messages['Ключ Blockscout подключён. Для этой сети требуется тариф Builder, Business или Pro.']={en:'Blockscout key connected. This network requires a Builder, Business or Pro plan.',zh:'已连接 Blockscout 密钥。此网络需要 Builder、Business 或 Pro 套餐。'};
messages['Эта сеть временно отключена. Сохранённые данные доступны в истории.']={en:'This network is temporarily disabled. Saved records remain available in history.',zh:'此网络暂时停用。已保存的记录仍可在历史记录中查看。'};
Object.assign(messages,{'Общий сервер BlockRadia недоступен. Повторите запрос позже.':{en:'The shared BlockRadia server is unavailable. Please try again later.',zh:'BlockRadia 共享服务器不可用，请稍后重试。'},'Сервер занят. Повторите запрос через минуту.':{en:'The server is busy. Please try again in a minute.',zh:'服务器繁忙，请一分钟后重试。'},'Источник данных временно недоступен.':{en:'The data source is temporarily unavailable.',zh:'数据源暂时不可用。'}});
Object.assign(messages,{'Обзор показывает последние блоки. Общая статистика сети недоступна; история кошельков загружается через Alchemy.':{en:'The overview shows recent blocks. Network-wide statistics are unavailable; wallet history is loaded through Alchemy.',zh:'概览显示最近的区块。全网统计不可用；钱包历史通过 Alchemy 加载。'},'История Alchemy временно недоступна. Повторите загрузку.':{en:'Alchemy history is temporarily unavailable. Please retry.',zh:'Alchemy 历史记录暂时不可用，请重试。'},'Часть истории Alchemy не загружена. Повторите запрос.':{en:'Part of the Alchemy history could not be loaded. Please retry.',zh:'部分 Alchemy 历史记录未能加载，请重试。'},'Переводы с неизвестной точностью или структурой пропущены.':{en:'Transfers with unknown precision or structure were skipped.',zh:'已跳过精度或结构未知的转账。'},'Alchemy: до 50 входящих и 50 исходящих переводов, включая внутренние операции и ERC-20. Не полная история.':{en:'Alchemy: up to 50 incoming and 50 outgoing transfers, including internal transfers and ERC-20. Not the full history.',zh:'Alchemy：最多50笔转入和50笔转出，含内部转账及ERC-20。并非完整历史。'}});
const messageKeys=Object.keys(messages).sort((a,b)=>b.length-a.length);
export function t(value:string):string{if(language==='ru'||!value)return value;const coverage=value.match(/^Расшифровано (\d+) из (\d+) транзакций\. Не загружено: (\d+)\. Граф неполный\.$/);if(coverage)return language==='en'?'Decoded '+coverage[1]+' of '+coverage[2]+' transactions. Not loaded: '+coverage[3]+'. The graph is incomplete.':'已解析 '+coverage[2]+' 笔交易中的 '+coverage[1]+' 笔，未加载 '+coverage[3]+' 笔。关系图不完整。';const clean=value.trim(),entry=messages[clean];if(entry)return value.replace(clean,entry[language]);let result=value;for(const key of messageKeys){if(key.length>8&&result.includes(key))result=result.split(key).join(messages[key][language]);}return result;}
export function useI18n(){const current=useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn)}},()=>language,()=> 'ru' as Language);return {language:current,setLanguage,t,locale:getLocale()};}
