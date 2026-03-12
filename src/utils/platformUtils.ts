import { Platform } from 'react-native';

export type PlatformType =
    | 'ios-web'       // iOS 手机/平板浏览器
    | 'android-web'   // Android 手机浏览器
    | 'pc-web'        // 电脑浏览器
    | 'native-android' // Android APK
    | 'native-ios';   // iOS 原生 App

/**
 * 检测当前运行平台类型
 */
export function getPlatformType(): PlatformType {
    if (Platform.OS === 'android') return 'native-android';
    if (Platform.OS === 'ios') return 'native-ios';

    // Web 环境：通过 UA 区分
    if (typeof navigator !== 'undefined') {
        const ua = navigator.userAgent || '';
        if (/iPhone|iPad|iPod/i.test(ua)) return 'ios-web';
        if (/Android/i.test(ua)) return 'android-web';
    }
    return 'pc-web';
}

/**
 * 是否是手机浏览器（iOS 或 Android 浏览器）
 */
export function isMobileBrowser(): boolean {
    const type = getPlatformType();
    return type === 'ios-web' || type === 'android-web';
}
