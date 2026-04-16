import CryptoJS from 'crypto-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';

export const getAppChannel = async (): Promise<string> => {
    if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const c = urlParams.get('c');
                if (c) return c;
            } catch (ignored) { }
        }
        return '0';
    } else if (Platform.OS === 'android') {
        const ChannelModule = NativeModules ? NativeModules.ChannelModule : null;
        if (ChannelModule) {
            try {
                const channel = await ChannelModule.getChannel();
                return channel || '0';
            } catch (e) {
                return '0';
            }
        }
        return '0';
    }
    return '0';
};

// ----------------------------------------------------
// 1. 配置参数
// ----------------------------------------------------

// 此处完全从环境变量读取，源码库不再包含任何真实密钥。
// 本地开发请确保 .env.local 已配置，Vercel 部署请在后台 Environment Variables 中配置。
const SUPABASE_PROJECT_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const BASE_URL = `${SUPABASE_PROJECT_URL}/functions/v1`;

// 与服务端约定好的对称加密密钥
const SECRET_KEY = process.env.EXPO_PUBLIC_API_SECRET_KEY || '';

// ----------------------------------------------------
// 2. 加解密工具函数
// ----------------------------------------------------

/**
 * 将明文对象加密为 AES 密文
 */
const encryptRequest = (data: any): string => {
    try {
        const jsonString = JSON.stringify(data);
        return CryptoJS.AES.encrypt(jsonString, SECRET_KEY).toString();
    } catch (error) {
        console.error('请求加密失败:', error);
        throw new Error('Failed to encrypt request');
    }
};

/**
 * 将远端返回的加密的 AES 密文解密出最初对象
 */
const decryptResponse = (encryptedText: string): any => {
    try {
        const bytes = CryptoJS.AES.decrypt(encryptedText, SECRET_KEY);
        const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
        return JSON.parse(decryptedData);
    } catch (error) {
        console.error('响应解密失败:', error);
        throw new Error('Failed to decrypt response');
    }
};

// ----------------------------------------------------
// 3. 通用请求封装 (支持防抓包设计)
// ----------------------------------------------------

interface RequestOptions {
    method?: 'GET' | 'POST';
    payload?: any;
    encrypt?: boolean; // 是否启用 Payload 发送加密
    timeout?: number;
}

/**
 * 核心请求方法
 */
export const requestApi = async (endpoint: string, options: RequestOptions = {}) => {
    const { method = 'POST', payload, encrypt = true, timeout = 15000 } = options;
    const url = `${BASE_URL}${endpoint}`;

    // 1. 组装请求体
    let bodyData: any = undefined;
    if (payload) {
        if (encrypt) {
            bodyData = JSON.stringify({ payload: encryptRequest(payload) });
        } else {
            bodyData = JSON.stringify(payload);
        }
    }

    // 2. 准备超时控制器 (AbortController)
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: bodyData,
            signal: controller.signal,
        });

        clearTimeout(id);

        if (!response.ok) {
            let errorMsg = `HTTP error! status: ${response.status}`;
            try {
                const errJson = await response.json();
                errorMsg = errJson.message || errJson.error || errorMsg;
            } catch (e) {
                // Ignore json parsing error for error response
                const text = await response.text();
                if (text) errorMsg = `${errorMsg} - ${text.substring(0, 100)}`;
            }
            throw new Error(errorMsg);
        }

        let resJson;
        try {
            resJson = await response.json();
        } catch (e) {
            const rawText = await response.text();
            throw new Error(`服务器返回了非 JSON 数据: ${rawText.substring(0, 50)}`);
        }

        // 3. 解析服务端返回数据。如果包含 encrypted_payload，就走解密逻辑
        if (typeof resJson === 'object' && resJson.encrypted_payload) {
            const rawObj = decryptResponse(resJson.encrypted_payload);
            return rawObj;
        } else {
            // 未加密原样返回
            return resJson;
        }

    } catch (error: any) {
        clearTimeout(id);
        if (error.name === 'AbortError') {
            console.warn(`[API] 请求 ${endpoint} 超时撤销`);
            throw new Error('请求超时，请检查网络后再试');
        }
        console.error(`[API] 请求 ${endpoint} 异常:`, error);
        throw error;
    }
};

// ----------------------------------------------------
// 4. 业务接口具体定义
// ----------------------------------------------------

/**
 * App 启动初始化获取分配的 UUID、积分及模型设置
 */
export const apiInitUser = async (localUserId: string, channel: string = '0') => {
    return requestApi('/init', {
        payload: { user_id: localUserId, channel },
        timeout: 10000 // Init 接口要求 10s 超时
    });
};

/**
 * 虚拟女友双模型聊天接口
 */
export const apiChat = async (userId: string, girlId: number, message: string, history: any[], systemContext?: string) => {
    return requestApi('/chat', {
        payload: {
            user_id: userId,
            girl_id: girlId,
            message,
            history,
            system_context: systemContext
        },
        timeout: 30000 // 预留模型思考时间
    });
};

/**
 * 故事生成双模型接口
 */
export const apiStory = async (userId: string, protagonist: string, plot: string, extra_req: string, context?: string) => {
    return requestApi('/story', {
        payload: {
            user_id: userId,
            protagonist,
            plot,
            extra_req,
            context
        },
        timeout: 45000 // 故事耗时较长
    });
};

/**
 * 充值下单接口
 */
export const apiCreateOrder = async (userId: string, amount: number, pointsToAdd: number) => {
    return requestApi('/create_order', {
        payload: {
            user_id: userId,
            amount,
            points_to_add: pointsToAdd
        }
    });
};
