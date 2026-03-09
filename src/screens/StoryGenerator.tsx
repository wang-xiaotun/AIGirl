import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    Modal,
    Platform
} from 'react-native';
import { Sparkles, History as HistoryIcon, Trash2, X, Copy } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { apiStory } from '../utils/apiClient';
import { storage } from '../utils/storage';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';


interface StoryGeneratorProps {
    user: any;
    onRequireAuth: () => void;
    onRequireTopUp: () => void;
    onUpdatePoints: (points: number, remainFreeChats?: number, remainFreeStories?: number) => void;
}

export default function StoryGenerator({
    user,
    onRequireAuth,
    onRequireTopUp,
    onUpdatePoints
}: StoryGeneratorProps) {
    const [character, setCharacter] = useState('');
    const [plot, setPlot] = useState('');
    const [extra, setExtra] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentStory, setCurrentStory] = useState('');
    const [history, setHistory] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedStory, setSelectedStory] = useState<any>(null);
    const [continuePlot, setContinuePlot] = useState('');
    const [isContinuing, setIsContinuing] = useState(false);
    const [isMaskedStory, setIsMaskedStory] = useState(false); // 记录当前生成的是否是打码版
    const abortControllerRef = useRef<AbortController | null>(null);

    const maskStoryContent = (content: string) => {
        let masked = '';
        const groupSize = 10;
        const visibleChars = 5;
        for (let i = 0; i < content.length; i++) {
            // 每 10 个字符一组，判断在组内的索引
            const indexInGroup = i % groupSize;
            if (indexInGroup >= visibleChars) {
                // 后 5 个字符打码
                masked += '*';
            } else {
                // 前 5 个直接显示
                masked += content[i];
            }
        }
        return masked;
    };

    React.useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const saved = await storage.getItem<any[]>('story_history');
        setHistory(saved || []);
    };

    const handleGenerate = async () => {
        if (!plot.trim()) {
            if (Platform.OS === 'web') {
                window.alert('请填写剧情设定');
            } else {
                Alert.alert('提示', '请填写剧情设定');
            }
            return;
        }

        // V2 权限校验：余额不足 且 后端返回的免费故事次数也耗尽时
        if (user.points < 100 && (user.free_story_count || 0) <= 0) {
            onRequireTopUp();
            return;
        }

        setIsGenerating(true);
        setCurrentStory('');
        setIsMaskedStory(false);
        setShowHistory(false);

        try {
            // 调用服务端 /story 接口
            const res = await apiStory(user.userId, character, plot, extra);

            if (res.code === 0) {
                let fullStory = res.data.story;

                // --- 打码逻辑判定 ---
                // 条件：用户积分为0 且 历史记录为空（说明是首篇）
                if (user.points === 0 && history.length === 0) {
                    fullStory = maskStoryContent(fullStory);
                    setIsMaskedStory(true);
                }

                setCurrentStory(fullStory);

                const newEntry = {
                    id: Date.now().toString(),
                    title: plot.slice(0, 15) + '...',
                    content: fullStory,
                    date: new Date().toLocaleString(),
                    isMasked: user.points === 0 && history.length === 0 // 标记在历史库中也是打码版
                };
                const newHistory = [newEntry, ...history];
                setHistory(newHistory);
                await storage.setItem('story_history', newHistory);

                onUpdatePoints(res.data.consumed_points || 5, undefined, res.data.remain_free_stories);
            } else if (res.code === 1001) {
                onRequireTopUp();
            } else {
                throw new Error(res.message || '业务异常');
            }
        } catch (e: any) {
            Alert.alert('错误', e.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleContinue = async (existingContent: string, isFromHistory: boolean = false) => {
        // V2 权限校验
        if (user.points < 100 && (user.free_story_count || 0) <= 0) {
            onRequireTopUp();
            return;
        }

        setIsContinuing(true);
        try {
            // 调用服务端 /story 接口，传入 context
            const res = await apiStory(user.userId, character, continuePlot, extra, existingContent);

            if (res.code === 0) {
                const addedContent = res.data.story;
                const fullStory = existingContent + "\n\n" + addedContent;

                if (isFromHistory && selectedStory) {
                    const updatedStory = { ...selectedStory, content: fullStory };
                    setSelectedStory(updatedStory);
                    // 更新历史记录中的该项
                    const newHistory = history.map(item => item.id === selectedStory.id ? updatedStory : item);
                    setHistory(newHistory);
                    await storage.setItem('story_history', newHistory);
                } else {
                    setCurrentStory(fullStory);
                    // 同样更新历史记录中刚生成的最新项 (假设是 history[0])
                    if (history.length > 0) {
                        const updatedLatest = { ...history[0], content: fullStory };
                        const newHistory = [updatedLatest, ...history.slice(1)];
                        setHistory(newHistory);
                        await storage.setItem('story_history', newHistory);
                    }
                }

                setContinuePlot(''); // 清空
                onUpdatePoints(res.data.consumed_points || 5, undefined, res.data.remain_free_stories);
            } else if (res.code === 1001) {
                onRequireTopUp();
            } else {
                throw new Error(res.message || '业务异常');
            }
        } catch (e: any) {
            Alert.alert('错误', e.message);
        } finally {
            setIsContinuing(false);
        }
    };

    const deleteHistory = async (id: string) => {
        const newHistory = history.filter(item => item.id !== id);
        setHistory(newHistory);
        await storage.setItem('story_history', newHistory);
    };

    const handleCopy = async (content: string) => {
        const prefix = user.storyCopyPrefix || '故事生成产品体验：***';
        const finalContent = `${prefix}\n\n${content}`;
        await Clipboard.setStringAsync(finalContent);

        if (Platform.OS === 'web') {
            window.alert('已复制到剪贴板');
        } else {
            Alert.alert('提示', '已复制到剪贴板');
        }
    };

    if (showHistory) {
        return (
            <SafeAreaView style={styles.container}>
                <LinearGradient
                    colors={['#FFF0F5', '#F5F5F5']}
                    style={StyleSheet.absoluteFill}
                />


                <View style={styles.header}>
                    <Text style={styles.title}>创作历史</Text>
                    <TouchableOpacity onPress={() => setShowHistory(false)}>
                        <Text style={styles.linkText}>返回创作</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={history}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 15 }}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.historyCard}
                            onPress={() => setSelectedStory(item)}
                        >
                            <View style={styles.historyHeader}>
                                <Text style={styles.historyTitle}>{item.title}</Text>
                                <TouchableOpacity onPress={() => deleteHistory(item.id)}>
                                    <Trash2 size={18} color="#999" />
                                </TouchableOpacity>
                            </View>
                            <Text style={styles.historyDate}>{item.date}</Text>
                            <Text style={styles.historyContent} numberOfLines={3}>{item.content}</Text>
                        </TouchableOpacity>
                    )}
                />

                {/* --- Story Detail Modal --- */}
                <Modal
                    visible={!!selectedStory}
                    animationType="fade"
                    transparent
                    onRequestClose={() => setSelectedStory(null)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.detailCard}>
                            <View style={styles.detailHeader}>
                                <Text style={styles.detailTitle}>故事详情</Text>
                                <TouchableOpacity onPress={() => setSelectedStory(null)}>
                                    <X size={24} color={THEME.COLORS.TEXT_SUB} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView contentContainerStyle={styles.detailScrollContent}>
                                <Text style={styles.detailDate}>{selectedStory?.date}</Text>
                                <Text style={styles.detailLabel}>剧情设定：</Text>
                                <Text style={styles.detailPlot}>{selectedStory?.title.replace('...', '')}</Text>
                                <View style={styles.divider} />
                                <View style={styles.detailStoryHeader}>
                                    <Text style={styles.detailContentTitle}>故事正文</Text>
                                    {!selectedStory?.isMasked && (
                                        <TouchableOpacity
                                            style={styles.copyButtonSmall}
                                            onPress={() => handleCopy(selectedStory?.content)}
                                        >
                                            <Copy size={16} color={THEME.COLORS.PRIMARY} />
                                            <Text style={styles.copyButtonTextSmall}>复制全文</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text style={styles.detailContent}>{selectedStory?.content}</Text>

                                <View style={styles.continueSection}>
                                    <Text style={styles.continueLabel}>想续写的剧情走势 (选填)：</Text>
                                    <TextInput
                                        style={styles.continueInput}
                                        placeholder="例如：突然天降暴雨..."
                                        maxLength={100}
                                        value={continuePlot}
                                        onChangeText={setContinuePlot}
                                    />
                                    <TouchableOpacity
                                        style={[styles.continueButton, isContinuing && styles.disabledButton]}
                                        onPress={() => handleContinue(selectedStory.content, true)}
                                        disabled={isContinuing}
                                    >
                                        {isContinuing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.continueButtonText}>续写故事</Text>}
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient
                colors={['#FDF2F8', '#F5F3FF']}
                style={StyleSheet.absoluteFill}
            />


            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.header}>
                    <Text style={styles.title}>AI 故事创作</Text>
                    <TouchableOpacity onPress={() => setShowHistory(true)}>
                        <HistoryIcon size={24} color="#FF69B4" />
                    </TouchableOpacity>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>人物设定 (选填)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例如：男主：林克；女主：塞尔达"
                        placeholderTextColor="#999"
                        value={character}
                        onChangeText={setCharacter}
                        returnKeyType="next"
                    />

                    <Text style={[styles.label, { color: '#FF69B4' }]}>剧情设定 (必填)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="描述你想看到的剧情片段..."
                        placeholderTextColor="#999"
                        value={plot}
                        onChangeText={setPlot}
                        multiline
                        numberOfLines={4}
                        returnKeyType="next"
                        textAlignVertical="top"
                    />

                    <Text style={styles.label}>额外要求 (选填)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="例如：大量描写女主美貌"
                        placeholderTextColor="#999"
                        value={extra}
                        onChangeText={setExtra}
                        returnKeyType="done"
                    />

                    <TouchableOpacity
                        style={[styles.generateButton, isGenerating && styles.disabledButton]}
                        onPress={handleGenerate}
                        disabled={isGenerating}
                    >
                        {isGenerating ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Sparkles size={20} color="#fff" />
                                <Text style={styles.buttonText}>开始创作</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                {currentStory ? (
                    <View style={styles.resultContainer}>
                        <View style={styles.resultHeader}>
                            <Text style={styles.resultTitle}>生成结果：</Text>
                            {isMaskedStory && (
                                <TouchableOpacity style={styles.maskedBadge} onPress={onRequireTopUp}>
                                    <Text style={styles.maskedBadgeText}>预览版 - 充值解锁全文</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                        {!isMaskedStory && (
                            <TouchableOpacity
                                style={styles.copyButton}
                                onPress={() => handleCopy(currentStory)}
                            >
                                <Copy size={18} color={THEME.COLORS.PRIMARY} />
                                <Text style={styles.copyButtonText}>复制全文</Text>
                            </TouchableOpacity>
                        )}
                        <Text style={styles.resultContent}>{currentStory}</Text>

                        {isMaskedStory && (
                            <TouchableOpacity style={styles.unlockButtonInStory} onPress={onRequireTopUp}>
                                <Text style={styles.unlockButtonText}>查看完整未打码内容 (需充值)</Text>
                            </TouchableOpacity>
                        )}

                        <View style={[styles.continueSection, { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 }]}>
                            <Text style={styles.continueLabel}>续写这段故事：</Text>
                            <TextInput
                                style={styles.continueInput}
                                placeholder="输入想要的剧情走势..."
                                maxLength={100}
                                value={continuePlot}
                                onChangeText={setContinuePlot}
                            />
                            <TouchableOpacity
                                style={[styles.continueButton, isContinuing && styles.disabledButton]}
                                onPress={() => handleContinue(currentStory, false)}
                                disabled={isContinuing}
                            >
                                {isContinuing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.continueButtonText}>续写故事</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
    );
}

// 模拟导入 FlatList 避免错误
import { FlatList } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: THEME.COLORS.SURFACE,
        borderBottomWidth: 1,
        borderBottomColor: THEME.COLORS.BORDER,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: THEME.COLORS.TEXT_MAIN,
    },
    linkText: {
        color: '#FF69B4',
        fontWeight: 'bold',
    },
    form: {
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: THEME.COLORS.TEXT_SUB,
        marginBottom: 8,
        marginTop: 15,
    },
    input: {
        backgroundColor: THEME.COLORS.SURFACE,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        color: THEME.COLORS.TEXT_MAIN,
        borderWidth: 1,
        borderColor: THEME.COLORS.BORDER,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    generateButton: {
        backgroundColor: THEME.COLORS.PRIMARY,
        height: 50,
        borderRadius: 25,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 30,
        elevation: 4,
        shadowColor: THEME.COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    disabledButton: {
        backgroundColor: '#CCC',
        shadowOpacity: 0,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    resultContainer: {
        padding: 20,
        margin: 20,
        backgroundColor: THEME.COLORS.SURFACE,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: THEME.COLORS.PRIMARY,
        elevation: 3,
        shadowColor: THEME.COLORS.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    resultTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF69B4',
        marginBottom: 10,
    },
    resultContent: {
        fontSize: 15,
        lineHeight: 24,
        color: THEME.COLORS.TEXT_MAIN,
    },
    historyCard: {
        backgroundColor: THEME.COLORS.SURFACE,
        padding: 18,
        borderRadius: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: THEME.COLORS.BORDER,
        elevation: 2,
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: THEME.COLORS.TEXT_MAIN,
    },
    historyDate: {
        fontSize: 12,
        color: '#999',
        marginTop: 4,
    },
    historyContent: {
        fontSize: 14,
        color: THEME.COLORS.TEXT_SUB,
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    detailCard: {
        backgroundColor: THEME.COLORS.SURFACE,
        borderRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: THEME.COLORS.BORDER,
    },
    detailTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: THEME.COLORS.TEXT_MAIN,
    },
    detailScrollContent: {
        padding: 20,
    },
    detailDate: {
        fontSize: 12,
        color: '#999',
        marginBottom: 10,
    },
    detailLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: THEME.COLORS.PRIMARY,
        marginBottom: 5,
    },
    detailPlot: {
        fontSize: 14,
        color: THEME.COLORS.TEXT_SUB,
        marginBottom: 15,
        fontStyle: 'italic',
    },
    divider: {
        height: 1,
        backgroundColor: THEME.COLORS.BORDER,
        marginVertical: 15,
    },
    detailContent: {
        fontSize: 16,
        lineHeight: 26,
        color: THEME.COLORS.TEXT_MAIN,
    },
    continueSection: {
        marginTop: 10,
    },
    continueLabel: {
        fontSize: 13,
        fontWeight: 'bold',
        color: THEME.COLORS.TEXT_SUB,
        marginBottom: 8,
    },
    continueInput: {
        backgroundColor: '#F9FAFB',
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: THEME.COLORS.TEXT_MAIN,
        borderWidth: 1,
        borderColor: THEME.COLORS.BORDER,
    },
    continueButton: {
        backgroundColor: THEME.COLORS.PRIMARY,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 12,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    maskedBadge: {
        backgroundColor: '#FFFBEB',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    maskedBadgeText: {
        fontSize: 12,
        color: '#92400E',
        fontWeight: 'bold',
    },
    unlockButtonInStory: {
        backgroundColor: '#FFF1F2',
        marginTop: 15,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: THEME.COLORS.PRIMARY,
    },
    unlockButtonText: {
        color: THEME.COLORS.PRIMARY,
        fontSize: 14,
        fontWeight: 'bold',
    },
    copyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        marginBottom: 10,
        alignSelf: 'flex-start',
    },
    copyButtonText: {
        marginLeft: 6,
        color: THEME.COLORS.PRIMARY,
        fontSize: 14,
        fontWeight: 'bold',
    },
    detailStoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    detailContentTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: THEME.COLORS.PRIMARY,
    },
    copyButtonSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 6,
        backgroundColor: '#F3F4F6',
    },
    copyButtonTextSmall: {
        marginLeft: 4,
        color: THEME.COLORS.PRIMARY,
        fontSize: 12,
        fontWeight: '600',
    }
});
