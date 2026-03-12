import React from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { X, Smartphone, Monitor } from 'lucide-react-native';
import { getPlatformType, PlatformType } from '../utils/platformUtils';
import { THEME } from '../constants/theme';

interface AddToHomeScreenProps {
    visible: boolean;
    onClose: () => void;
}

function IOSGuide() {
    return (
        <View style={styles.guideBody}>
            <Text style={styles.guideTitle}>📲 添加到 iPhone 主屏幕</Text>
            <Text style={styles.guideDesc}>在 Safari 浏览器中操作：</Text>
            <View style={styles.stepList}>
                <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                    <Text style={styles.stepText}>点击底部工具栏中的 <Text style={styles.highlight}>共享</Text> 图标（方块加箭头）</Text>
                </View>
                <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                    <Text style={styles.stepText}>在弹出菜单中向下滑动(查看更多)，找到并点击 <Text style={styles.highlight}>「添加到主屏幕」</Text></Text>
                </View>
                <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                    <Text style={styles.stepText}>点击右上角 <Text style={styles.highlight}>「添加」</Text>，即可在桌面看到入口图标</Text>
                </View>
            </View>
            <Text style={styles.tipText}>💡 添加后可像 App 一样全屏使用，无需每次输入网址</Text>
        </View>
    );
}

function AndroidGuide() {
    return (
        <View style={styles.guideBody}>
            <Text style={styles.guideTitle}>📲 添加到 Android 桌面</Text>
            <Text style={styles.guideDesc}>在 Chrome 浏览器中操作：</Text>
            <View style={styles.stepList}>
                <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>1</Text></View>
                    <Text style={styles.stepText}>点击浏览器右上角的 <Text style={styles.highlight}>⋮ 菜单</Text> 按钮</Text>
                </View>
                <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>2</Text></View>
                    <Text style={styles.stepText}>在菜单中找到并点击 <Text style={styles.highlight}>「添加到主屏幕」</Text></Text>
                </View>
                <View style={styles.stepRow}>
                    <View style={styles.stepNum}><Text style={styles.stepNumText}>3</Text></View>
                    <Text style={styles.stepText}>点击 <Text style={styles.highlight}>「添加」</Text>，桌面即出现快捷入口图标</Text>
                </View>
            </View>
            <Text style={styles.tipText}>💡 添加后可像 App 一样全屏使用，无需每次输入网址</Text>
        </View>
    );
}

function PCGuide() {
    return (
        <View style={styles.guideBody}>
            <View style={styles.pcIconWrap}>
                <Smartphone size={48} color={THEME.COLORS.PRIMARY} />
            </View>
            <Text style={styles.guideTitle}>📱 请在手机浏览器中打开</Text>
            <Text style={styles.pcDesc}>
                在手机浏览器中访问本网站，即可将其添加到手机桌面，方便下次快速进入。
            </Text>
            <View style={styles.urlBox}>
                <Monitor size={16} color="#999" />
                <Text style={styles.urlText} numberOfLines={1}>
                    {typeof window !== 'undefined' ? window.location.hostname : 'girlfriend.homes'}
                </Text>
            </View>
        </View>
    );
}

export default function AddToHomeScreen({ visible, onClose }: AddToHomeScreenProps) {
    const platformType = getPlatformType();

    const renderContent = () => {
        switch (platformType) {
            case 'ios-web': return <IOSGuide />;
            case 'android-web': return <AndroidGuide />;
            default: return <PCGuide />;
        }
    };

    return (
        <Modal visible={visible} animationType="fade" transparent>
            <View style={styles.overlay}>
                <View style={styles.card}>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <X size={22} color="#666" />
                    </TouchableOpacity>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {renderContent()}
                    </ScrollView>
                    <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                        <Text style={styles.doneBtnText}>我知道了</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        position: 'relative',
    },
    closeBtn: {
        position: 'absolute',
        top: 14,
        right: 14,
        zIndex: 10,
        padding: 4,
    },
    guideBody: {
        paddingTop: 8,
        paddingBottom: 8,
    },
    guideTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a',
        marginBottom: 8,
        marginTop: 4,
    },
    guideDesc: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
    },
    stepList: {
        gap: 14,
        marginBottom: 18,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    stepNum: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: THEME.COLORS.PRIMARY,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
        marginTop: 1,
    },
    stepNumText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 22,
    },
    highlight: {
        color: THEME.COLORS.PRIMARY,
        fontWeight: 'bold',
    },
    tipText: {
        fontSize: 13,
        color: '#888',
        backgroundColor: '#FFF5F8',
        padding: 10,
        borderRadius: 8,
        lineHeight: 20,
    },
    // PC 样式
    pcIconWrap: {
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8,
    },
    pcDesc: {
        fontSize: 15,
        color: '#444',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 16,
    },
    urlBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        padding: 10,
        gap: 6,
    },
    urlText: {
        flex: 1,
        fontSize: 13,
        color: '#666',
    },
    // 底部按钮
    doneBtn: {
        marginTop: 20,
        backgroundColor: THEME.COLORS.PRIMARY,
        borderRadius: 12,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
