const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Ho_Chi_Minh';

const getTZParts = (date, timeZone = APP_TIMEZONE) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
};

const formatSessionLabel = (session, index = 0) => {
  const d = new Date(session.date);
  const dateStr = d.toLocaleDateString('vi-VN');
  return `Phiên ${index + 1} · ${dateStr} · ${session.startCheckIn}–${session.endCheckIn}`;
};

const normalizeSessionIds = (event, inputIds) => {
  const sessions = event.sessions || [];
  if (!sessions.length) return { ok: false, message: 'Sự kiện chưa có phiên (session).' };

  const validIds = new Set(sessions.map((s) => String(s._id)));
  const ids = (inputIds || []).map((id) => String(id)).filter((id) => validIds.has(id));

  if (ids.length === 0) {
    return { ok: false, message: 'Vui lòng chọn ít nhất một phiên tham dự.' };
  }

  const labels = ids.map((id) => {
    const idx = sessions.findIndex((s) => String(s._id) === id);
    return formatSessionLabel(sessions[idx], idx);
  });

  return { ok: true, sessionIds: ids, sessionLabels: labels };
};

const resolveRegistrationSessions = (event, { sessionIds, coversAllSessions, ticketType }) => {
  const sessions = event.sessions || [];
  const shouldCoverAll = coversAllSessions === true
    ? true
    : coversAllSessions === false
      ? false
      : Boolean(ticketType?.coversAllSessions);
  if (shouldCoverAll) {
    return {
      ok: true,
      sessionIds: sessions.map((s) => String(s._id)),
      sessionLabels: sessions.map((s, i) => formatSessionLabel(s, i)),
    };
  }
  return normalizeSessionIds(event, sessionIds);
};

const getTodaySession = (event, now = new Date()) => {
  const sessions = event.sessions || [];
  const nParts = getTZParts(now);
  return sessions.find((s) => {
    const dParts = getTZParts(new Date(s.date));
    return dParts.year === nParts.year && dParts.month === nParts.month && dParts.day === nParts.day;
  });
};

const ticketCoversSession = (ticket, sessionId) => {
  const ids = ticket.sessionIds?.length
    ? ticket.sessionIds.map(String)
    : null;
  if (!ids) return true; // vé cũ: cho phép mọi phiên (tương thích)
  return ids.includes(String(sessionId));
};

const getEffectiveSessionIds = (ticket, event) => {
  if (ticket.sessionIds?.length) return ticket.sessionIds.map(String);
  return (event.sessions || []).map((s) => String(s._id));
};

module.exports = {
  MAX_TICKETS_PER_USER_PER_EVENT: 4,
  formatSessionLabel,
  resolveRegistrationSessions,
  getTodaySession,
  getTZParts,
  ticketCoversSession,
  getEffectiveSessionIds,
};
