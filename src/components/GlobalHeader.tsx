import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    Modal,
    SafeAreaView
} from 'react-native';
import { User, Wallet, ShoppingBag, Trash2 } from 'lucide-react-native';
import { THEME } from '../constants/theme';


export default function GlobalHeader({
    user,
    onAvatarPress,
    onShopPress,
    onRefreshPoints,
    onClearData
}: {
    user: any,
    onAvatarPress: () => void,
    onShopPress: () => void,
    onRefreshPoints: () => void,
    onClearData: () => void
}) {
    const avatarLabel = user.userId ? user.userId.substring(0, 1).toUpperCase() : 'U';

    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onAvatarPress} style={styles.avatar}>
                <Text style={styles.avatarText}>{avatarLabel}</Text>
            </TouchableOpacity>

            <View style={styles.rightSection}>
                <View style={styles.pointsContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <ShoppingBag size={16} color="#FFD700" />
                        <Text style={styles.pointsText}>💎 {user.points}</Text>
                    </View>
                    <TouchableOpacity onPress={onRefreshPoints} style={styles.refreshButton}>
                        <Text style={styles.refreshText}>刷新</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={onShopPress} style={styles.shopButton}>
                    <Wallet size={20} color="#FF69B4" />
                    <Text style={styles.shopText}>商店</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={onClearData}
                    style={styles.clearButton}
                    activeOpacity={0.7}
                >
                    <Trash2 size={18} color="#FF4D4D" />
                    <Text style={styles.clearText}>测试清空</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        backgroundColor: THEME.COLORS.SURFACE,
        borderBottomWidth: 1,
        borderBottomColor: THEME.COLORS.BORDER,

        paddingTop: 0, // 假设在 SafeAreaView 内
    },
    rightSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: THEME.COLORS.PRIMARY,

        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.COLORS.BACKGROUND,
        paddingHorizontal: 12,
        paddingVertical: 6,

        borderRadius: 20,
    },
    pointsText: {
        marginLeft: 5,
        fontSize: 14,
        fontWeight: 'bold',
        color: '#DAA520',
    },
    refreshButton: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: THEME.COLORS.PRIMARY,
        borderRadius: 4,
    },
    refreshText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: 'bold',
    },
    shopButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    shopText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
        color: THEME.COLORS.PRIMARY,
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: THEME.COLORS.BORDER,
        borderRadius: 8,
        backgroundColor: THEME.COLORS.SURFACE,
    },
    clearText: {
        marginLeft: 4,
        fontSize: 12,
        color: '#FF4D4D',
        fontWeight: '500',
    }
});
