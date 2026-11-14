export async function processBatch(updates, handle, checkpoint) {
  let next = 0;
  const finished = new Set();
  const groups = new Map();
  for (const update of updates) {
    const message = update.message ?? update.callback_query?.message;
    const chat = message?.chat.id;
    if (!groups.has(chat)) groups.set(chat, []);
    groups.get(chat).push(update);
  }

  const queue = groups.values();
  async function worker() {
    for (const group of queue) {
      for (const update of group) {
        await handle(update);
        finished.add(update.update_id);
        const previous = next;
        while (next < updates.length && finished.delete(updates[next].update_id)) next++;
        if (next > previous) checkpoint(updates[next - 1].update_id + 1);
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(4, groups.size)}, worker));
}
