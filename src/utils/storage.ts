import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/keys';

export const storage = {
    /**
     * 保存数据
     */
    async setItem<T>(key: string, value: T): Promise<void> {
        try {
            const jsonValue = JSON.stringify(value);
            await AsyncStorage.setItem(key, jsonValue);
        } catch (e) {
            console.error('AsyncStorage Error (setItem):', e);
        }
    },

    /**
     * 读取数据
     */
    async getItem<T>(key: string): Promise<T | null> {
        try {
            const jsonValue = await AsyncStorage.getItem(key);
            return jsonValue != null ? JSON.parse(jsonValue) : null;
        } catch (e) {
            console.error('AsyncStorage Error (getItem):', e);
            return null;
        }
    },

    /**
     * 删除数据
     */
    async removeItem(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(key);
        } catch (e) {
            console.error('AsyncStorage Error (removeItem):', e);
        }
    },

    /**
     * 清空所有本地数据
     */
    async clearAll(): Promise<void> {
        try {
            await AsyncStorage.clear();
        } catch (e) {
            console.error('AsyncStorage Error (clearAll):', e);
        }
    },

    /**
     * 获取特定女友的聊天历史
     */
    async getChatHistory(gfId: string): Promise<any[]> {
        const history = await this.getItem<any[]>(`${STORAGE_KEYS.CHAT_HISTORY_PREFIX}${gfId}`);
        return history || [];
    },

    /**
     * 保存特定女友的聊天历史
     */
    async saveChatHistory(gfId: string, history: any[]): Promise<void> {
        await this.setItem(`${STORAGE_KEYS.CHAT_HISTORY_PREFIX}${gfId}`, history);
    },

    /**
     * 清理所有聊天和故事记录（不清理用户凭据和积分）
     */
    async clearLocalHistory(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            // 找出所有以 chat_history_ 开头的 key 和 story_history
            const keysToRemove = keys.filter(key =>
                key.startsWith(STORAGE_KEYS.CHAT_HISTORY_PREFIX) ||
                key === STORAGE_KEYS.STORY_HISTORY
            );

            if (keysToRemove.length > 0) {
                for (const k of keysToRemove) {
                    await AsyncStorage.removeItem(k);
                }
            }
        } catch (e) {
            console.error('AsyncStorage Error (clearLocalHistory):', e);
        }
    },
};
