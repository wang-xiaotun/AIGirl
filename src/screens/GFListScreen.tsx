import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    useWindowDimensions
} from 'react-native';
import { getGirlfriends, getGirlAvatar } from '../data/girlfriends';
import { GF } from '../types';
import { Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';

interface GFListProps {
    userModel: 'deepseek' | 'grok';
    onSelectGF: (gf: GF) => void;
    isAllUnlocked: boolean;
    onUnlockRequest: () => void;
}

export default function GFListScreen({ userModel, onSelectGF, isAllUnlocked, onUnlockRequest }: GFListProps) {
    const { width, height } = useWindowDimensions();

    // 响应式布局：宽度大于高度时（网页宽屏）显示 4 列，否则 2 列
    const numColumns = width > height ? 5 : 2;

    // 计算屏幕左右内边距(30) + 每个卡片左右外边距(10 * 列数)
    const itemWidth = (width - 30 - (10 * numColumns)) / numColumns;

    const renderItem = ({ item, index }: { item: GF, index: number }) => {
        // 默认 ID=1 (index 0) 解锁，其他受 isAllUnlocked 控制
        const isLocked = index !== 0 && !isAllUnlocked;

        return (
            <TouchableOpacity
                style={[styles.card, { width: itemWidth }]}
                onPress={() => isLocked ? onUnlockRequest() : onSelectGF(item)}
                activeOpacity={0.8}
            >
                <Image
                    source={getGirlAvatar(userModel, item.avatar)}
                    style={[styles.avatar, { height: itemWidth * 1.3 }]}
                    resizeMode="cover"
                />
                {isLocked && (
                    <View style={styles.lockOverlay}>
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.6)']}
                            style={StyleSheet.absoluteFill}
                        />
                        <Lock size={28} color="#fff" />
                    </View>
                )}
                <View style={styles.info}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.style}>{item.style}</Text>
                    <Text style={styles.occupation}>{item.occupation}</Text>
                    <Text style={styles.measurements}>{item.measurements}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <LinearGradient
            colors={['#FFF0F5', '#F5F3FF']}
            style={styles.container}
        >


            <FlatList
                key={numColumns}
                data={getGirlfriends(userModel)}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={numColumns}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContent: {
        padding: 15,
    },
    card: {
        backgroundColor: THEME.COLORS.SURFACE,
        borderRadius: 20,
        marginBottom: 15,
        marginHorizontal: 5,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: THEME.COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    avatar: {
        width: '100%',
    },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
    },
    info: {
        padding: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: 'bold',
        color: THEME.COLORS.TEXT_MAIN,
    },
    style: {
        fontSize: 12,
        color: '#FF69B4',
        marginTop: 4,
        fontWeight: '600',
    },
    occupation: {
        fontSize: 12,
        color: THEME.COLORS.PRIMARY,
        marginTop: 2,
    },
    measurements: {
        fontSize: 11,
        color: THEME.COLORS.TEXT_SUB,
        marginTop: 2,
    },
});
