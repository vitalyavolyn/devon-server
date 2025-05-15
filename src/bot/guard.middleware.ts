import { Context } from 'telegraf';

export const createGuardMiddleware =
  (chatId: string) => (context: Context, next: () => void) => {
    // console.log(context.update);
    if ('message' in context.update) {
      if (context.update.message.chat.id === Number(chatId)) next();
    }
  };
