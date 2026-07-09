import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { WebView } from 'react-native-webview';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 로컬 목 가상 데이터베이스 (웹과 일치하는 데모 계정 및 가상 스키마)
  const DEMO_EMAIL = 'test@roothome.org';
  const DEMO_PASSWORD = 'password123';

  const handleLogin = () => {
    if (!email.trim() || !password) {
      Alert.alert('보안 가드', '이메일 주소와 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsLoading(true);

    // 실제 비밀번호 일치 확인 검증 (Strict Verification)
    setTimeout(() => {
      setIsLoading(false);
      if (email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD) {
        setIsAuthenticated(true);
        Alert.alert('인증 성공', '반갑고 안온한 복귀입니다, 홍길동 실향민 대원님!');
      } else {
        Alert.alert('인증 실패', '❌ 가입 정보가 없거나 비밀번호가 일치하지 않습니다.');
      }
    }, 1000);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setEmail('');
    setPassword('');
    Alert.alert('보안 안내', '보안 세션이 파기되었으며, 지도 기상 제어가 잠금 처리되었습니다.');
  };

  // 1. 비로그인 상태: 실향민 게이트웨이 강제 (Auth Gate Screen)
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.authContainer}>
        <StatusBar style="light" />
        <View style={styles.authCard}>
          <View style={styles.logoGroup}>
            <Text style={styles.logoIcon}>🧭</Text>
            <Text style={styles.logoText}>RootHome Secure</Text>
            <Text style={styles.logoSub}>실향민 안심 가동 시스템 모바일 게이트웨이</Text>
          </View>

          <Text style={styles.sectionTitle}>계정 로그인</Text>
          <Text style={styles.label}>이메일 주소</Text>
          <TextInput
            style={styles.input}
            placeholder="example@roothome.org"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>비밀번호</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={isLoading}>
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.loginBtnText}>보안 인증 로그인</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.demoBanner}>
            데모 계정: <Text style={styles.bold}>test@roothome.org</Text> / <Text style={styles.bold}>password123</Text>
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // 2. 로그인 완료: 고화질 실시간 기상관제 지도 및 네비 모바일 뷰
  return (
    <SafeAreaView style={styles.mainContainer}>
      <StatusBar style="light" />
      
      {/* 모바일 최적화 상단 바 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>🧭 RootMap 관제</Text>
          <Text style={styles.headerUser}>홍길동 대원 (정착인증등급: A)</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      {/* 실시간 GIS 웹 매핑 인스턴스 전격 바인딩 */}
      <WebView 
        source={{ uri: 'https://hackerton-three.vercel.app' }} // Vercel 또는 호스팅된 실관제 웹주소 연결 가능
        style={styles.mapWebView}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>실시간 우회 위성지도 레이어 수신중...</Text>
          </View>
        )}
      />

      {/* 모바일 전용 프리미엄 HUD 시트 */}
      <View style={styles.bottomSheet}>
        <View style={styles.indicator} />
        <Text style={styles.sheetTitle}>실시간 안전 복귀 피난처 안내</Text>
        <View style={styles.metricRow}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>최적 귀향 루트</Text>
            <Text style={styles.metricValue}>OSRM 최단 거리</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>전역 환경 상태</Text>
            <Text style={[styles.metricValue, { color: '#10B981' }]}>🟢 안전구역 우세</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  authContainer: {
    flex: 1,
    backgroundColor: '#0F172A', // Slate 900
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1E293B', // Slate 800
    borderRadius: 24,
    padding: 28,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 5,
  },
  logoGroup: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F8FAFC',
    fontFamily: 'System',
  },
  logoSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 6,
  },
  input: {
    height: 48,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 16,
  },
  loginBtn: {
    height: 50,
    backgroundColor: '#3B82F6', // Blue 500
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loginBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  demoBanner: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 18,
    textAlign: 'center',
  },
  bold: {
    fontWeight: '700',
    color: '#94A3B8',
  },
  mainContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    height: 64,
    backgroundColor: '#1E293B',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  headerUser: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  logoutBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#F87171',
  },
  mapWebView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 12,
  },
  bottomSheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    borderBottomWidth: 0,
  },
  indicator: {
    width: 40,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: '#334155',
  }
});
