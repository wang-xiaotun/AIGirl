import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  Linking,
  Platform
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { storage } from './src/utils/storage';
import { User, GF } from './src/types';
import GlobalHeader from './src/components/GlobalHeader';
import LoadingScreen from './src/components/LoadingScreen';
import { apiInitUser, apiCreateOrder, getAppChannel } from './src/utils/apiClient';
import GFListScreen from './src/screens/GFListScreen';
import ChatRoom from './src/screens/ChatRoom';
import StoryGenerator from './src/screens/StoryGenerator';
import { Heart, BookOpen, Crown, User as UserIcon } from 'lucide-react-native';
import { THEME } from './src/constants/theme';
import appConfig from './app.json';
import AddToHomeScreen from './src/components/AddToHomeScreen';
import { getPlatformType, isMobileBrowser } from './src/utils/platformUtils';
import { STORAGE_KEYS } from './src/constants/keys';


const INITIAL_USER: User = {
  userId: '',
  points: 0,
  currentModel: 'deepseek',
  isAllUnlocked: false,
  free_chat_count: 3,
  free_story_count: 1,
  local_chat_count: 0,
  local_story_count: 0,
  storyCopyPrefix: '故事生成产品体验：***',
};

export default function App() {
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [activeTab, setActiveTab] = useState<'girls' | 'story'>('girls');
  const [selectedGF, setSelectedGF] = useState<GF | null>(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [payType, setPayType] = useState<'alipay' | 'wechat'>('alipay');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const savedUser = await storage.getItem<User>('user_data');
      const localUserId = savedUser?.userId || '';

      const channel = await getAppChannel();
      const res = await apiInitUser(localUserId, channel);
      if (res.code === 0) {
        const serverData = res.data;
        const newUser: User = {
          ...(savedUser || INITIAL_USER),
          userId: serverData.user_id,
          points: serverData.points,
          free_chat_count: serverData.free_chat_count ?? INITIAL_USER.free_chat_count,
          free_story_count: serverData.free_story_count ?? INITIAL_USER.free_story_count,
          currentModel: serverData.current_model || 'deepseek',
          storyCopyPrefix: serverData.story_copy_prefix || INITIAL_USER.storyCopyPrefix,
        };
        await saveUserData(newUser);
        setIsLoading(false);
      } else {
        throw new Error(res.message || '初始化验证失败');
      }
    } catch (err: any) {
      console.error('App init err:', err);
      Alert.alert(
        '网络异常',
        '网络问题，请重新启动App',
        [{ text: '重试', onPress: () => loadUserData() }]
      );
    }
  };

  const saveUserData = async (updatedUser: User) => {
    setUser(updatedUser);
    await storage.setItem('user_data', updatedUser);
  };

  const handleClearHistory = async () => {
    const doClear = async () => {
      await storage.clearLocalHistory();
      setSelectedGF(null);
      setActiveTab('girls');
      setShowProfileModal(false);
      if (typeof window !== 'undefined') {
        window.alert('历史记录已清空');
      } else {
        Alert.alert('完成', '历史记录已清空');
      }
    };

    if (typeof window !== 'undefined') {
      if (window.confirm('确定要清空所有本地聊天和故事记录吗？')) {
        await doClear();
      }
    } else {
      Alert.alert('确认', '确定要清空所有本地聊天和故事记录吗？', [
        { text: '取消', style: 'cancel' },
        {
          text: '确定清空',
          style: 'destructive',
          onPress: doClear
        }
      ]);
    }
  };

  const handleClearData = async () => {
    const doClear = async () => {
      console.log('Force clearing all data...');
      await storage.clearAll();
      setUser(INITIAL_USER);
      setSelectedGF(null);
      setActiveTab('girls');
      if (typeof window !== 'undefined') {
        window.location.reload();
      } else {
        Alert.alert('完成', '所有本地数据已清空');
      }
    };

    if (typeof window !== 'undefined') {
      if (window.confirm('警告：确定要清空所有数据吗？')) {
        await doClear();
      }
    } else {
      Alert.alert('警告', '确定要清空所有本地数据吗？', [
        { text: '取消', style: 'cancel' },
        { text: '确定清空', style: 'destructive', onPress: doClear }
      ]);
    }
  };

  const handleTopUp = async (amount: number, points: number) => {
    if (isProcessingPay) return;
    setIsProcessingPay(true);
    try {
      console.log('Initiating topup...', amount, points, payType);
      const res = await apiCreateOrder(user.userId, amount, points, payType);
      console.log('Topup res:', res);

      if (res.code === 0 && res.data && res.data.pay_url) {
        setShowShopModal(false);
        const urlToOpen = res.data.pay_url;

        // 针对不同平台处理唤起/跳转机制
        if (Platform.OS === 'web') {
          // 在 Web 中，由于 await 后失去了同步的用户点击事件上下文，常被浏览器当成广告弹窗拦截
          const newWindow = window.open(urlToOpen, '_blank');
          if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
            console.warn('浏览器弹窗拦截已触发，将改用同页跳转');
            window.alert('为确保收银台成功打开，接下来将在当前窗口直接跳转。请在支付完成后重新打开本应用。');
            window.location.href = urlToOpen;
          } else {
            window.alert('支付页面已经为您打开！\n如果您已经完成支付，请点击确认刷新余额：');
            loadUserData();
          }
        } else {
          // Native 平台正常调用 Linking
          await Linking.openURL(urlToOpen);
          Alert.alert(
            '支付发起了',
            '请在被唤起的应用中完成支付。完成后请回到此处点击刷新余额！',
            [
              { text: '稍后再说', style: 'cancel' },
              { text: '已支付，刷新余额', onPress: () => loadUserData() }
            ]
          );
        }
      } else {
        throw new Error(res.message || '网关未返回成功状态');
      }
    } catch (err: any) {
      console.error('handleTopUp Catch:', err);
      // Web 和 Native 兼容的弹窗提示
      if (typeof window !== 'undefined' && Platform.OS === 'web') {
        window.alert(`生成订单失败: ${err.message || '未知错误'}`);
      } else {
        Alert.alert('生成订单失败', err.message || '未知错误');
      }
    } finally {
      setIsProcessingPay(false);
    }
  };

  const updatePoints = async (pointsUsed: number, remainFreeChats?: number, remainFreeStories?: number) => {
    const newChatCount = user.local_chat_count + (activeTab === 'girls' ? 1 : 0);
    const newUser = {
      ...user,
      points: Math.max(0, user.points - pointsUsed),
      free_chat_count: remainFreeChats !== undefined ? remainFreeChats : user.free_chat_count,
      free_story_count: remainFreeStories !== undefined ? remainFreeStories : user.free_story_count,
      local_chat_count: newChatCount,
      local_story_count: user.local_story_count + (activeTab === 'story' ? 1 : 0)
    };
    await saveUserData(newUser);

    // 手机浏览器新用户：第2次聊天结束后，自动弹出 PWA 引导（只弹一次）
    if (activeTab === 'girls' && newChatCount === 2 && isMobileBrowser()) {
      const alreadyShown = await storage.getItem<boolean>(STORAGE_KEYS.PWA_GUIDE_SHOWN);
      if (!alreadyShown) {
        await storage.setItem(STORAGE_KEYS.PWA_GUIDE_SHOWN, true);
        setShowPwaGuide(true);
      }
    }
  };

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        {selectedGF ? (
          <ChatRoom
            gf={selectedGF}
            user={user}
            onBack={() => setSelectedGF(null)}
            onRequireAuth={() => setShowShopModal(true)} // v2将强制注册改为强制充值
            onRequireTopUp={() => setShowShopModal(true)}
            onUpdatePoints={updatePoints}
          />
        ) : (
          <SafeAreaView style={{ flex: 1 }}>
            <GlobalHeader
              user={user}
              onAvatarPress={() => setShowProfileModal(true)}
              onShopPress={() => setShowShopModal(true)}
              onRefreshPoints={loadUserData}
              onClearData={handleClearData}
            />

            <View style={styles.content}>
              {activeTab === 'girls' ? (
                <GFListScreen
                  userModel={user.currentModel}
                  onSelectGF={setSelectedGF}
                  isAllUnlocked={user.isAllUnlocked || user.points > 0}
                  onUnlockRequest={() => setShowShopModal(true)}
                />
              ) : (
                <StoryGenerator
                  user={user}
                  onRequireAuth={() => setShowShopModal(true)}
                  onRequireTopUp={() => setShowShopModal(true)}
                  onUpdatePoints={updatePoints}
                />
              )}
            </View>

            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'girls' && styles.activeTab]}
                onPress={() => setActiveTab('girls')}
              >
                <Heart size={24} color={activeTab === 'girls' ? THEME.COLORS.PRIMARY : THEME.COLORS.TEXT_SUB} />
                <Text style={[styles.tabText, activeTab === 'girls' && styles.activeTabText]}>虚拟女友</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'story' && styles.activeTab]}
                onPress={() => setActiveTab('story')}
              >
                <BookOpen size={24} color={activeTab === 'story' ? THEME.COLORS.PRIMARY : THEME.COLORS.TEXT_SUB} />
                <Text style={[styles.tabText, activeTab === 'story' && styles.activeTabText]}>故事生成</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        )}

        {/* --- Modals Moved to Root Level to Ensure Visibility in ChatRoom --- */}

        {/* Auth Modal Removed in V2. Uses direct User ID mapping */}

        {/* Shop Modal */}
        <Modal visible={showShopModal} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>点数商店</Text>
              <Text style={styles.modalSubTitle}>任意充值即可解锁全部女友</Text>

              <View style={styles.paySelector}>
                <TouchableOpacity
                  style={[styles.payOption, payType === 'alipay' && styles.payOptionActiveAlipay]}
                  onPress={() => setPayType('alipay')}
                >
                  <Text style={[styles.payOptionText, payType === 'alipay' && styles.payOptionTextActive]}>支付宝</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.payOption, payType === 'wechat' && styles.payOptionActiveWechat]}
                  onPress={() => setPayType('wechat')}
                >
                  <Text style={[styles.payOptionText, payType === 'wechat' && styles.payOptionTextActive]}>微信</Text>
                </TouchableOpacity>
              </View>

              {isProcessingPay ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: THEME.COLORS.PRIMARY, marginBottom: 10 }}>正在生成订单...</Text>
                  {/* 实际应用中这里可以加 ActivityIndicator */}
                </View>
              ) : (
                <>
                  <TouchableOpacity style={styles.tier} onPress={() => handleTopUp(30, 50000)}>
                    <View>
                      <Text style={styles.tierTitle}>💎 50,000 点</Text>
                      <Text style={styles.tierCaption}>约 5 万字对话</Text>
                    </View>
                    <Text style={styles.tierPrice}>￥30</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.tier} onPress={() => handleTopUp(70, 200000)}>
                    <View>
                      <Text style={styles.tierTitle}>💎 200,000 点</Text>
                      <Text style={styles.tierCaption}>约 20 万字对话</Text>
                    </View>
                    <Text style={styles.tierPrice}>￥70</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.tier, styles.premiumTier]} onPress={() => handleTopUp(99, 400000)}>
                    <View>
                      <View style={styles.bestValue}>
                        <Text style={styles.bestValueText}>最超值</Text>
                      </View>
                      <Text style={styles.tierTitle}>💎 400,000 点</Text>
                      <Text style={styles.tierCaption}>约 40 万字对话</Text>
                    </View>
                    <Text style={styles.tierPrice}>￥99</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowShopModal(false)} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>稍后再说</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Profile Modal */}
        <Modal visible={showProfileModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={[styles.avatarLarge, { backgroundColor: '#8A2BE2' }]}>
                <UserIcon color="#fff" size={40} />
              </View>
              <Text style={[styles.modalTitle, { marginTop: 15, marginBottom: 5, fontSize: 16 }]}>ID: {user.userId}</Text>
              <Text style={{ color: '#666', marginBottom: 20 }}>当前点数: 💎 {user.points}</Text>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F3F4F6' }]}
                onPress={() => setShowAgreementModal(true)}
              >
                <Text style={[styles.modalButtonText, { color: '#666' }]}>用户协议</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F3F4F6', marginTop: 10 }]}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#333' }]}>返回主页</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#FFF5F5', marginTop: 10 }]}
                onPress={handleClearHistory}
              >
                <Text style={[styles.modalButtonText, { color: '#FF4D4D' }]}>清空本地聊天记录</Text>
              </TouchableOpacity>

              {/* 仅浏览器（非 APK）显示"添加桌面快捷方式"入口 */}
              {getPlatformType() !== 'native-android' && getPlatformType() !== 'native-ios' && (
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#F0F4FF', marginTop: 10 }]}
                  onPress={() => { setShowProfileModal(false); setShowPwaGuide(true); }}
                >
                  <Text style={[styles.modalButtonText, { color: '#4F6EF7' }]}>📲 添加桌面快捷方式</Text>
                </TouchableOpacity>
              )}

              <Text style={styles.versionText}>Version {appConfig.expo.version}</Text>
            </View>
          </View>
        </Modal>

        {/* PWA 添加桌面快捷方式引导弹框 */}
        <AddToHomeScreen visible={showPwaGuide} onClose={() => setShowPwaGuide(false)} />

        {/* User Agreement Modal */}
        <Modal visible={showAgreementModal} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxHeight: '80%' }]}>
              <Text style={styles.modalTitle}>用户协议</Text>
              <ScrollView style={{ width: '100%', marginBottom: 20 }}>
                <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>
                  本网站不提供任何内容，仅根据用户输入的提示词生成输出，用户需对其生成的内容承担全部责任。{"\n\n"}
                  我们对涉及未成年人的内容实行零容忍政策，一旦发现将立即封号处理。{"\n"}
                  此外，如果您未满 18 岁，请不要使用本网站。{"\n\n"}
                  使用本网站即表示您理解并同意这些条款。{"\n\n"}
                  <Text style={{ fontWeight: 'bold', color: THEME.COLORS.PRIMARY }}>
                    注意：服务器不保存您的输入/输出，历史记录仅保存在本地。
                  </Text>{"\n"}
                  换设备、或清除本地设备数据 都会导致记录丢失。
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowAgreementModal(false)}
              >
                <Text style={styles.modalButtonText}>我已了解并同意</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.COLORS.BACKGROUND,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    height: 60,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: THEME.COLORS.BORDER,
    backgroundColor: THEME.COLORS.SURFACE,
  },
  tab: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTab: {
    borderTopWidth: 2,
    borderTopColor: THEME.COLORS.PRIMARY,
  },
  tabText: {
    fontSize: 12,
    color: THEME.COLORS.TEXT_SUB,
    marginTop: 4,
  },
  activeTabText: {
    color: THEME.COLORS.PRIMARY,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: THEME.COLORS.SURFACE,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.COLORS.BORDER,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.COLORS.TEXT_MAIN,
    marginBottom: 20,
  },
  modalSubTitle: {
    fontSize: 14,
    color: '#FF69B4',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    height: 50,
    backgroundColor: THEME.COLORS.BACKGROUND,
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    color: THEME.COLORS.TEXT_MAIN,
    borderWidth: 1,
    borderColor: THEME.COLORS.BORDER,
  },
  modalButton: {
    width: '100%',
    height: 50,
    backgroundColor: THEME.COLORS.PRIMARY,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: 20,
  },
  closeButtonText: {
    color: '#999',
    fontSize: 16,
  },
  tier: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.COLORS.BACKGROUND,
    padding: 15,
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.COLORS.BORDER,
  },
  premiumTier: {
    backgroundColor: 'rgba(255, 45, 149, 0.1)',
    borderColor: THEME.COLORS.GOLD,
    borderWidth: 2,
  },
  tierTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.COLORS.TEXT_MAIN,
  },
  tierCaption: {
    fontSize: 12,
    color: THEME.COLORS.TEXT_SUB,
    marginTop: 2,
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: THEME.COLORS.PRIMARY,
  },
  bestValue: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  bestValueText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  paySelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    width: '100%',
    marginBottom: 20,
  },
  payOption: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  payOptionActiveAlipay: {
    backgroundColor: '#00A1E9',
    elevation: 2,
    shadowColor: '#00A1E9',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  payOptionActiveWechat: {
    backgroundColor: '#07C160',
    elevation: 2,
    shadowColor: '#07C160',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  payOptionText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  payOptionTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  versionText: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
  },
});
