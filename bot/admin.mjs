import {currentAMLSnapshot, currentAdditionalSources, refreshAML} from '../lib/aml-refresh.ts';

const button = (text, action) => ({text, callback_data: 'admin:' + action});
const limits = [3, 6, 12];
const pageSize = 8;

export function createAdminPanel({store, explorer, api, say}) {
  let limit = store.get('admin:limit', 6);
  if (!limits.includes(limit)) limit = 6;
  const started = Date.now();
  const metrics = {requests: 0, failures: 0, throttled: 0};

  async function show(chat, action = 'stats', messageId) {
    let lines;
    let rows = [];
    const back = [button('‹ Главное меню', 'stats')];
    if (action === 'stats' || action === 'prune') {
      if (action === 'prune') store.pruneSessions(Date.now());
      const stats = store.adminStats();
      lines = [
        '<b>Панель администратора</b>',
        'Пользователи с сохранёнными данными: ' + stats.users,
        'Группы с настроенным автопоиском: ' + stats.groups,
        'Отслеживаемые адреса: ' + stats.watches,
        'Сохранённые сессии: ' + stats.sessions,
      ];
      if (action === 'prune') lines.push('Очистка завершена.');
      rows = [
        [button('Пользователи', 'users:0'), button('Группы', 'groups:0')],
        [button('Диагностика', 'health'), button('Источники AML', 'aml')],
        [button('Лимиты запросов', 'limits'), button('Очистить сессии', 'cleanup')],
        [button('Обновить', 'stats')],
      ];
    } else if (/^(users|groups):[0-9]{1,7}$/.test(action)) {
      const [section, index] = action.split(':');
      const page = Number(index);
      const records = store.adminDirectory(section, page * pageSize, pageSize + 1);
      lines = [section === 'users' ? '<b>Пользователи с сохранёнными данными</b>' : '<b>Группы с настройкой автопоиска</b>', 'Страница ' + (page + 1)];
      for (const record of records.slice(0, pageSize)) {
        lines.push(section === 'users' ? 'ID ' + record.id : 'ID ' + record.id + ' · автопоиск ' + (record.enabled ? 'включён' : 'выключен'));
      }
      if (!records.length) lines.push('Записей нет.');
      const navigation = [];
      if (page) navigation.push(button('‹ Назад', section + ':' + (page - 1)));
      if (records.length > pageSize) navigation.push(button('Далее ›', section + ':' + (page + 1)));
      if (navigation.length) rows.push(navigation);
    } else if (action === 'health') {
      lines = ['<b>Диагностика с запуска</b>', 'Время работы: ' + Math.floor((Date.now() - started) / 60000) + ' мин',
        'Память процесса: ' + Math.round(process.memoryUsage().rss / 1048576) + ' МБ',
        'Запросы к API: ' + metrics.requests, 'Ошибки API: ' + metrics.failures,
        'Запросы сверх лимита: ' + metrics.throttled];
      rows.push([button('Обновить показатели', 'health')]);
    } else if (action === 'aml' || action === 'aml_refresh') {
      let status;
      if (action === 'aml_refresh') {
        try {
          let partial;
          await refreshAML(async () => {
            const feed = await explorer('bitcoin', 'aml', '');
            partial = feed.error || feed.updateInProgress;
            return feed;
          }, true);
          status = partial ? 'Сервер вернул частичное или ещё выполняющееся обновление.' : 'Проверка базы завершена.';
        } catch { status = 'Обновление недоступно. Показана сохранённая база.'; }
      }
      lines = ['<b>Базы AML в боте</b>'];
      for (const source of [currentAMLSnapshot(), ...currentAdditionalSources()]) {
        lines.push(new URL(source.source).hostname + ' · ' + source.records.length + ' записей · ' + new Date(source.retrievedAt).toISOString().slice(0, 10));
      }
      if (status) lines.push(status);
      rows.push([button('Загрузить с сервера', 'aml_refresh')]);
    } else if (action === 'limits' || /^limit:(3|6|12)$/.test(action)) {
      if (action.startsWith('limit:')) {
        const selected = Number(action.split(':')[1]);
        store.set('admin:limit', selected);
        limit = selected;
      }
      lines = ['<b>Лимит на один чат</b>', 'Сейчас: ' + limit + ' команд или действий в минуту.'];
      rows.push(limits.map(n => button((n === limit ? '✓ ' : '') + n + '/мин', 'limit:' + n)));
    } else if (action === 'cleanup') {
      lines = ['<b>Очистить сессии?</b>', 'Удаляются сессии старше суток. Из остальных сохраняются последние 200.'];
      rows.push([button('Подтвердить очистку', 'prune')]);
    } else return;
    if (action !== 'stats' && action !== 'prune') rows.push(back);
    const text = lines.join('\n');
    const reply_markup = {inline_keyboard: rows};
    if (!messageId) return say(chat, text, {reply_markup});
    return api('editMessageText', {chat_id: chat.id, message_id: messageId, text, parse_mode:'HTML', reply_markup});
  }
  return {show, metrics, limit: () => limit};
}
