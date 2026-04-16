import 'react-native-get-random-values';
import './src/utils/i18n';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const [user, setUser] = useState<User>(INITIAL_USER);
  const [activeTab, setActiveTab] = useState<'girls' | 'story'>('girls');
  const [selectedGF, setSelectedGF] = useState<GF | null>(null);
  const [showShopModal, setShowShopModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingPay, setIsProcessingPay] = useState(false);
  const [qrData, setQrData] = useState<string | null>(null);

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
      console.log('Initiating topup...', amount, points);
      const res = await apiCreateOrder(user.userId, amount, points);
      console.log('Topup res:', res);

      if (res.code === 0 && res.data && res.data.pay_url) {
        setShowShopModal(false);
        const urlToOpen = res.data.pay_url;

        // 如果不是 http/https 链接，说明网关返回的是原始扫码串（如 QRIS 字符串），需单独展示二维码
        if (!urlToOpen.startsWith('http')) {
          setQrData(urlToOpen);
          return;
        }

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
                <Text style={[styles.tabText, activeTab === 'girls' && styles.activeTabText]}>{t('tab_girls')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'story' && styles.activeTab]}
                onPress={() => setActiveTab('story')}
              >
                <BookOpen size={24} color={activeTab === 'story' ? THEME.COLORS.PRIMARY : THEME.COLORS.TEXT_SUB} />
                <Text style={[styles.tabText, activeTab === 'story' && styles.activeTabText]}>{t('tab_story')}</Text>
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
              <Text style={styles.modalTitle}>{t('shop_title')}</Text>
              <Text style={styles.modalSubTitle}>{t('shop_subtitle')}</Text>

              {isProcessingPay ? (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Text style={{ color: THEME.COLORS.PRIMARY, marginBottom: 10 }}>{t('generating_order')}</Text>
                  {/* 实际应用中这里可以加 ActivityIndicator */}
                </View>
              ) : (
                <>
                  <TouchableOpacity style={styles.tier} onPress={() => handleTopUp(66000, 50000)}>
                    <View>
                      <Text style={styles.tierTitle}>{t('tier_50k')}</Text>
                      <Text style={styles.tierCaption}>{t('words_50k')}</Text>
                    </View>
                    <Text style={styles.tierPrice}>Rp 66.000</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.tier} onPress={() => handleTopUp(154000, 200000)}>
                    <View>
                      <Text style={styles.tierTitle}>{t('tier_200k')}</Text>
                      <Text style={styles.tierCaption}>{t('words_200k')}</Text>
                    </View>
                    <Text style={styles.tierPrice}>Rp 154.000</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={[styles.tier, styles.premiumTier]} onPress={() => handleTopUp(218000, 400000)}>
                    <View>
                      <View style={styles.bestValue}>
                        <Text style={styles.bestValueText}>{t('best_value')}</Text>
                      </View>
                      <Text style={styles.tierTitle}>{t('tier_400k')}</Text>
                      <Text style={styles.tierCaption}>{t('words_400k')}</Text>
                    </View>
                    <Text style={styles.tierPrice}>Rp 218.000</Text>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => setShowShopModal(false)} style={styles.closeButton}>
                    <Text style={styles.closeButtonText}>{t('maybe_later')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* QR Code Modal for QRIS payment */}
        <Modal visible={!!qrData} animationType="fade" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('scan_to_pay', '请扫码付款')}</Text>
              <Text style={styles.modalSubTitle}>{t('qris_tip', '请使用支持 QRIS 的印尼钱包 APP 扫码')}</Text>
              
              {qrData && (
                <View style={{ padding: 10, backgroundColor: '#fff', borderRadius: 10, marginBottom: 20 }}>
                  <Image 
                    source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrData)}` }} 
                    style={{ width: 250, height: 250 }} 
                  />
                </View>
              )}
              
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => {
                  setQrData(null);
                  loadUserData();
                }}
              >
                <Text style={styles.modalButtonText}>{t('payment_done', '已完成扫描支付')}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => setQrData(null)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>{t('cancel')}</Text>
              </TouchableOpacity>
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
              <Text style={{ color: '#666', marginBottom: 20 }}>{t('current_points')} 💎 {user.points}</Text>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#E0F7FA' }]}
                onPress={() => {
                   const nextLang = i18n.language.startsWith('id') ? 'en' : i18n.language.startsWith('en') ? 'zh' : 'id';
                   i18n.changeLanguage(nextLang);
                }}
              >
                <Text style={[styles.modalButtonText, { color: '#006064' }]}>{t('language_switch')}: {t('language_name')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F3F4F6', marginTop: 10 }]}
                onPress={() => setShowAgreementModal(true)}
              >
                <Text style={[styles.modalButtonText, { color: '#666' }]}>{t('user_agreement')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#F3F4F6', marginTop: 10 }]}
                onPress={() => setShowProfileModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#333' }]}>{t('back_to_home')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#FFF5F5', marginTop: 10 }]}
                onPress={handleClearHistory}
              >
                <Text style={[styles.modalButtonText, { color: '#FF4D4D' }]}>{t('clear_chat_history')}</Text>
              </TouchableOpacity>

              {/* 仅浏览器（非 APK）显示"添加桌面快捷方式"入口 */}
              {getPlatformType() !== 'native-android' && getPlatformType() !== 'native-ios' && (
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: '#F0F4FF', marginTop: 10 }]}
                  onPress={() => { setShowProfileModal(false); setShowPwaGuide(true); }}
                >
                  <Text style={[styles.modalButtonText, { color: '#4F6EF7' }]}>{t('add_to_home')}</Text>
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
              <Text style={styles.modalTitle}>{t('user_agreement')}</Text>
              <ScrollView style={{ width: '100%', marginBottom: 20 }}>
                <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 22 }}>
                  {t('agreement_text_1')}
                </Text>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowAgreementModal(false)}
              >
                <Text style={styles.modalButtonText}>{t('i_understand_agree')}</Text>
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
  versionText: {
    marginTop: 20,
    fontSize: 12,
    color: '#999',
  },
});
