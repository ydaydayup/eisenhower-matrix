'use client';
/**
 * 系统原生通知hook - 用于发送系统级通知
 * 注意：此hook仅在Electron环境中有效
 */
export function useNotification() {
  const isElectronAvailable = typeof window !== 'undefined' && window.electron;
  /**
   * 发送系统通知
   * @param title 通知标题
   * @param body 通知内容
   * @param urgency 通知优先级 ('normal' | 'critical' | 'low')
   */
  const sendNotification = (title: string, body: string, urgency: 'normal' | 'critical' | 'low' = 'normal') => {
    if (!isElectronAvailable) {
      return;
    }
    // 使用electron.send方法发送通知
    window.electron?.send('show-notification', { title, body, urgency });
  };
  /**
   * 为待办事项设置截止时间提醒
   * @param taskTitle 任务标题
   * @param timeOptions 时间选项，可以是预计完成时间(estimatedTime)或截止时间(dueDate)
   * @param messageOptions 自定义消息选项
   * @returns 用于取消通知的函数
   */
  const scheduleTaskReminder = (
    taskTitle: string, 
    timeOptions: { estimatedTime?: Date; dueDate?: Date }, 
    messageOptions?: { 
      expiredTitle?: string;
      expiredMessage?: string;
      reminderTitle?: string;
      reminderMessage?: string;
    }
  ) => {
    if (!isElectronAvailable) {
      return () => {};
    }
    // 优先使用预计完成时间，如果没有则使用截止时间
    const targetTime = timeOptions.estimatedTime || timeOptions.dueDate;
    if (!targetTime) {
      return () => {};
    }
    const now = new Date();
    const timeUntilTarget = targetTime.getTime() - now.getTime();
    // 默认消息
    const defaultMessages = {
      expiredTitle: '任务已过期',
      expiredMessage: `"${taskTitle}" 已经过了预计完成时间`,
      reminderTitle: '任务提醒',
      reminderMessage: `任务 "${taskTitle}" 已到预计完成时间`,
    };
    // 合并默认消息和自定义消息
    const messages = {...defaultMessages, ...messageOptions};
    // 如果时间已过，立即发送通知
    if (timeUntilTarget <= 0) {
      sendNotification(
        messages.expiredTitle, 
        messages.expiredMessage, 
        'critical'
      );
      return () => {};
    }
    // 设置定时器，在目标时间到达时发送通知
    const timerId = setTimeout(() => {
      sendNotification(
        messages.reminderTitle, 
        messages.reminderMessage, 
        'critical'
      );
    }, timeUntilTarget);
    // 返回取消函数
    return () => clearTimeout(timerId);
  };
  return {
    sendNotification,
    scheduleTaskReminder,
    isElectronAvailable,
  };
} 