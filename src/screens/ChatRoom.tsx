import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Image,
    useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, ChevronLeft } from 'lucide-react-native';
import { GF, Message } from '../types';
import { apiChat } from '../utils/apiClient';
import { storage } from '../utils/storage';
import { THEME } from '../constants/theme';
import { getGirlBg } from '../data/girlfriends';


interface ChatRoomProps {
    gf: GF;
    user: any;
    onBack: () => void;
    onRequireAuth: () => void;
    onRequireTopUp: () => void;
    onUpdatePoints: (points: number, remainFreeChats?: number, remainFreeStories?: number) => void;
}

export default function ChatRoom({
    gf,
    user,
    onBack,
    onRequireAuth,
    onRequireTopUp,
    onUpdatePoints
}: ChatRoomProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const flatListRef = useRef<FlatList>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const insets = useSafeAreaInsets();

    useEffect(() => {
        loadHistory();
        return () => abortControllerRef.current?.abort();
    }, [gf.id]);

    const loadHistory = async () => {
        const history = await storage.getChatHistory(gf.id);
        if (history.length === 0) {
            // 初始欢迎语
            const welcome: Message = {
                role: 'assistant',
                content: gf.intro
            };
            setMessages([welcome]);
            storage.saveChatHistory(gf.id, [welcome]);
        } else {
            setMessages(history);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isTyping) return;

        // V2权限校验：余额<=0 且 后端返回的免费聊天次数也耗尽时
        if (user.points <= 0 && (user.free_chat_count || 0) <= 0) {
            onRequireTopUp();
            return;
        }

        const userMsg: Message = { role: 'user', content: input };
        const newMessages = [...messages, userMsg];
        setMessages(newMessages);
        setInput('');
        setIsTyping(true);

        try {
            // 调用服务端 /chat 接口，传入纯历史记录
            const res = await apiChat(user.userId, Number(gf.id), userMsg.content, messages);

            if (res.code === 0) {
                const finalMsgs: Message[] = [...newMessages, { role: 'assistant', content: res.data.reply }];
                setMessages(finalMsgs);
                await storage.saveChatHistory(gf.id, finalMsgs);
                // 更新点数，因为 apiChat 返回结构是 { reply, consumed_points, remain_points, remain_free_chats }
                onUpdatePoints(res.data.consumed_points || 0, res.data.remain_free_chats);
            } else if (res.code === 1001) {
                onRequireTopUp();
                setMessages(messages);
            } else {
                throw new Error(res.message || '业务异常');
            }
        } catch (e: any) {
            Alert.alert('错误', e.message);
            setMessages(messages);
        } finally {
            setIsTyping(false);
        }
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View style={[
            styles.messageBubble,
            item.role === 'user' ? styles.userBubble : styles.assistantBubble
        ]}>
            <Text style={[
                styles.messageText,
                item.role === 'user' ? styles.userText : styles.assistantText
            ]}>
                {item.content}
            </Text>
        </View>
    );

    const bgSource = getGirlBg(user.currentModel, gf.id);
    // useWindowDimensions 会在键盘弹出/收起时实时更新，避免背景留白
    const { height: screenHeight, width: screenWidth } = useWindowDimensions();
    // 横屏时（宽 > 高）：图片高度完整显示，宽度等比缩放；竖屏时保持 cover
    const isLandscape = screenWidth > screenHeight;

    return (
        <View style={styles.container}>
            {/* 背景图片：使用固定高度防止键盘弹起时缩放 */}
            {bgSource && (
                isLandscape ? (
                    // 横屏：三层叠加——底图 cover（颜色自动匹配）+ 遮罩 + 主图 contain
                    <View style={StyleSheet.absoluteFill}>
                        {/* 第一层：同一张图 cover 铺满，边缘颜色天然匹配 */}
                        <Image
                            source={bgSource}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            blurRadius={18}
                        />
                        {/* 第二层：深色半透明遮罩，避免底图喧宾夺主 */}
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.38)' }]} />
                        {/* 第三层：主图 contain，高度完整居中清晰显示 */}
                        <Image
                            source={bgSource}
                            style={{ flex: 1 }}
                            resizeMode="contain"
                        />
                    </View>
                ) : (
                    // 竖屏：保持原有 cover 全屏覆盖
                    <View style={StyleSheet.absoluteFill}>
                        <Image
                            source={bgSource}
                            style={{ flex: 1 }}
                            resizeMode="cover"
                        />
                    </View>
                )
            )}

            {/*
              KeyboardAvoidingView：仅原生平台启用。
              Web 手机浏览器键盘弹出时浏览器已自动压缩 viewport，无需再次避让。
            */}
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                enabled={Platform.OS !== 'web'}
            >
                <View style={[styles.header, { paddingTop: insets.top }]}>
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <ChevronLeft size={28} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.title}>{gf.name}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(_, index) => index.toString()}
                    contentContainerStyle={styles.chatList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                />

                {isTyping && (
                    <View style={styles.typingIndicator}>
                        <ActivityIndicator size="small" color={THEME.COLORS.PRIMARY} />
                        <Text style={styles.typingText}>{gf.name} 正在输入...</Text>
                    </View>
                )}

                <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="和她说点什么..."
                        placeholderTextColor="#999"
                        multiline
                        returnKeyType="send"
                        onSubmitEditing={handleSend}
                        blurOnSubmit={true}
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]}
                        onPress={handleSend}
                        disabled={!input.trim() || isTyping}
                    >
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        minHeight: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: THEME.COLORS.SURFACE,
        borderBottomWidth: 1,
        borderBottomColor: THEME.COLORS.BORDER,
        paddingHorizontal: 10,
    },
    backButton: {
        padding: 5,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: THEME.COLORS.TEXT_MAIN,
    },
    chatList: {
        padding: 15,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 22,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: THEME.COLORS.PRIMARY,
        borderBottomRightRadius: 4,
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        backgroundColor: THEME.COLORS.SURFACE,
        borderBottomLeftRadius: 4,
        borderLeftWidth: 3,
        borderLeftColor: THEME.COLORS.PRIMARY,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userText: {
        color: '#FFF',
    },
    assistantText: {
        color: THEME.COLORS.TEXT_MAIN,
    },
    typingIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    typingText: {
        marginLeft: 8,
        fontSize: 12,
        color: '#FF69B4',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        backgroundColor: 'rgba(255, 255, 255, 0.85)', // 半透明背景
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0, 0, 0, 0.05)',
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 100,
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        paddingHorizontal: 16,
        paddingVertical: Platform.OS === 'android' ? 4 : 10,
        marginRight: 12,
        fontSize: 16,
        color: '#333333',           // 强制深色，兼容 Android 各版本
        borderWidth: 1,
        borderColor: THEME.COLORS.BORDER,
        textAlignVertical: 'center', // Android 多行时文字垂直对齐
    },
    sendButton: {
        width: 44,
        height: 44,
        backgroundColor: THEME.COLORS.PRIMARY,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 0,
    },
    sendButtonDisabled: {
        backgroundColor: '#E5E7EB',
    },
});
