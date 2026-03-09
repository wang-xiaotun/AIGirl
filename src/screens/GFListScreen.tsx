import React from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    Image,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { getGirlfriends, getGirlAvatar } from '../data/girlfriends';
import { GF } from '../types';
import { Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';


const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 40) / COLUMN_COUNT;

interface GFListProps {
    userModel: 'deepseek' | 'grok';
    onSelectGF: (gf: GF) => void;
    isAllUnlocked: boolean;
    onUnlockRequest: () => void;
}

export default function GFListScreen({ userModel, onSelectGF, isAllUnlocked, onUnlockRequest }: GFListProps) {
    const renderItem = ({ item, index }: { item: GF, index: number }) => {
        // 默认 ID=1 (index 0) 解锁，其他受 isAllUnlocked 控制
        const isLocked = index !== 0 && !isAllUnlocked;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => isLocked ? onUnlockRequest() : onSelectGF(item)}
                activeOpacity={0.8}
            >
                <Image
                    source={getGirlAvatar(userModel, item.avatar)}
                    style={styles.avatar}
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
                data={getGirlfriends(userModel)}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                numColumns={COLUMN_COUNT}
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
        width: ITEM_WIDTH,
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
        height: ITEM_WIDTH * 1.3,
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
