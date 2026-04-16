import React from 'react';
import { View, Image, StyleSheet, ActivityIndicator, useWindowDimensions, Platform } from 'react-native';
import { Loading } from '../../assets/loading';

export default function LoadingScreen() {
    const { width, height } = useWindowDimensions();
    const isLandscape = width > height;

    return (
        <View style={styles.container}>
            {isLandscape ? (
                <>
                    {/* 毛玻璃背景层: blurRadius 实现毛玻璃 */}
                    <Image 
                        source={Loading.loading} 
                        style={[styles.imageAbsolute, { opacity: 0.8 }]} 
                        resizeMode="cover" 
                        blurRadius={Platform.OS === 'web' ? 25 : 15} 
                    />
                    {/* 中间自适应的清晰主图 */}
                    <View style={styles.centerImageContainer}>
                        <Image 
                            source={Loading.loading} 
                            style={styles.imageContain} 
                            resizeMode="contain" 
                        />
                    </View>
                </>
            ) : (
                /* 竖屏: 直接满屏背景 */
                <Image source={Loading.loading} style={styles.imageAbsolute} resizeMode="cover" />
            )}
            
            <View style={styles.overlay}>
                <ActivityIndicator size="large" color="#FF69B4" />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageAbsolute: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    centerImageContainer: {
        width: '100%',
        height: '100%',
        zIndex: 2,
        justifyContent: 'center',
        alignItems: 'center',
        ...(Platform.OS === 'web' ? { boxShadow: '0 0 30px rgba(0,0,0,0.6)' as any } : {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 30,
            elevation: 10,
        }),
    },
    imageContain: {
        width: '100%',
        height: '100%',
    },
    overlay: {
        position: 'absolute',
        bottom: 100,
        zIndex: 3,
        alignItems: 'center',
    }
});
