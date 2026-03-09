import React from 'react';
import { View, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { Loading } from '../../assets/loading';

export default function LoadingScreen() {
    return (
        <View style={styles.container}>
            <Image source={Loading.loading} style={styles.image} resizeMode="cover" />
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
    },
    image: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 100,
    }
});
