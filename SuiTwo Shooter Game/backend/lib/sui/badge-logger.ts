type LogMeta = unknown;

function format(meta: LogMeta): string {
  if (meta == null) return '';
  if (meta instanceof Error) {
    return ` ${JSON.stringify({ message: meta.message, stack: meta.stack })}`;
  }
  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ' [meta_unserializable]';
  }
}

export const BadgeLogger = {
  info(message: string, meta?: LogMeta) {
    console.log(`[badge] ${message}${format(meta)}`);
  },
  warn(message: string, meta?: LogMeta) {
    console.warn(`[badge] ${message}${format(meta)}`);
  },
  error(message: string, meta?: LogMeta) {
    console.error(`[badge] ${message}${format(meta)}`);
  },
  debug(message: string, meta?: LogMeta) {
    if (process.env.DEBUG_BADGES === 'true') {
      console.debug(`[badge] ${message}${format(meta)}`);
    }
  },
};

