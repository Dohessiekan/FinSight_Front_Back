import React from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Easing } from 'react-native';
import Card from '../components/Card';
import colors from '../theme/colors';
import { MaterialIcons } from '@expo/vector-icons';

export default function AdviceScreen() {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const translateYAnim = React.useRef(new Animated.Value(20)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp)
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp)
      })
    ]).start();
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Animated.View 
        style={[
          styles.header,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }] 
          }
        ]}
      >
        <Text style={styles.title}>Financial Advice</Text>
        <Text style={styles.subtitle}>Expert tips to manage your money wisely</Text>
      </Animated.View>
      
      <Animated.View 
        style={[
          styles.cardContainer,
          { 
            opacity: fadeAnim,
            transform: [{ translateY: translateYAnim }] 
          }
        ]}
      >
        <Card style={[styles.card, styles.cardElevated]}>
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primaryLight }]}>
              <MaterialIcons name="insights" size={24} color={colors.primary} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.adviceTitle}>Track Your Spending</Text>
              <Text style={styles.advice}>Monitor your weekly expenses to avoid overspending and identify saving opportunities.</Text>
            </View>
          </View>
        </Card>
        
        <Card style={[styles.card, styles.cardElevated]}>
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: colors.warningLight }]}>
              <MaterialIcons name="warning" size={24} color={colors.warning} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.adviceTitle}>Beware of Scams</Text>
              <Text style={styles.advice}>Be cautious of suspicious messages asking for money or personal information.</Text>
            </View>
          </View>
        </Card>
        
        <Card style={[styles.card, styles.cardElevated]}>
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: colors.successLight }]}>
              <MaterialIcons name="verified-user" size={24} color={colors.success} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.adviceTitle}>Verify Senders</Text>
              <Text style={styles.advice}>Always confirm the identity of recipients before making transactions.</Text>
            </View>
          </View>
        </Card>
        
        <Card style={[styles.card, styles.cardElevated]}>
          <View style={styles.row}>
            <View style={[styles.iconContainer, { backgroundColor: colors.infoLight }]}>
              <MaterialIcons name="savings" size={24} color={colors.info} />
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.adviceTitle}>Build an Emergency Fund</Text>
              <Text style={styles.advice}>Aim to save 3-6 months of living expenses for unexpected situations.</Text>
            </View>
          </View>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  cardContainer: {
    gap: 20,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: colors.cardBackground,
  },
  cardElevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  adviceTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },
  advice: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});