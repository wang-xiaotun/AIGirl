import { GirlAvatars } from '../../assets/avatars';
import { GirlAvatarsG } from '../../assets/avatars_g';
import { GirlBgAvatars } from '../../assets/girl_bg';
import { GirlBgAvatarsG } from '../../assets/girl_bg_g';
import { GF } from '../types';

import i18n from '../utils/i18n';
import { GIRLFRIENDS_ZH, GIRLFRIENDS_GROK_ZH } from './girlfriends_zh';
import { GIRLFRIENDS_EN, GIRLFRIENDS_GROK_EN } from './girlfriends_en';
import { GIRLFRIENDS_ID, GIRLFRIENDS_GROK_ID } from './girlfriends_id';

export const getGirlfriends = (model: 'deepseek' | 'grok') => {
    const lang = i18n.language || 'id';

    if (lang.startsWith('zh')) {
        return model === 'grok' ? GIRLFRIENDS_GROK_ZH : GIRLFRIENDS_ZH;
    } else if (lang.startsWith('en')) {
        return model === 'grok' ? GIRLFRIENDS_GROK_EN : GIRLFRIENDS_EN;
    } else {
        // Default to Indonesian if not zh or en
        return model === 'grok' ? GIRLFRIENDS_GROK_ID : GIRLFRIENDS_ID;
    }
};

export const getGirlAvatar = (model: 'deepseek' | 'grok', avatarKey: string) => {
    return model === 'grok' ? GirlAvatarsG[avatarKey] : GirlAvatars[avatarKey];
};

export const getGirlBg = (model: 'deepseek' | 'grok', gfId: string) => {
    const bgKey = `girl_bg_${gfId}`;
    return model === 'grok' ? GirlBgAvatarsG[bgKey] : GirlBgAvatars[bgKey];
};
