import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { manipulateAsync } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function App() {
  return <HomeScreen />;
}

function HomeScreen() {
  const [image, setImage] = useState<{ uri: string; base64: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [durationHours, setDurationHours] = useState<number>(1);
  const [durationMinutes, setDurationMinutes] = useState<number>(0);
  const [result, setResult] = useState<string>('');
  const [showResult, setShowResult] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSelectedDate(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const hourOptions = useMemo(() => Array.from({ length: 25 }, (_, index) => index), []);
  const minuteOptions = useMemo(() => Array.from({ length: 12 }, (_, index) => index * 5), []);

  const formatDateLine = (date: Date) =>
    date.toLocaleDateString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

  const formatTimeLine = (date: Date) =>
    date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

  const formatDateTime = (date: Date) => `${formatDateLine(date)} at ${formatTimeLine(date)}`;

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'We need access to your camera to capture parking signs.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const original = result.assets[0];

      try {
        const resized = await manipulateAsync(  
          original.uri,
          [{ resize: { width: 800 } }],
          { compress: 0.8, format: 'jpeg', base64: true }
        );

        if(!resized.base64) throw new Error("Base64 conversion failed");

        setImage({ uri: resized.uri, base64: resized.base64 });
      } catch (err) {
        console.error('Error resizing image', err);
        Alert.alert('Error', 'Failed to resize image');
      }
    }
  };

  const analyzeParking = async () => {
    if (!image || !image.base64) {
      Alert.alert('Missing input', 'Please upload a parking sign image.');
      return;
    }

    const apiKey = Constants.expoConfig?.extra?.openAiApiKey;
    if (!apiKey) {
      Alert.alert(
        'Configuration issue',
        'OpenAI API key is missing. Please add OPENAI_API_KEY to your environment.'
      );
      return;
    }

    setIsLoading(true);

    try {
      const formattedDayTime = formatDateTime(selectedDate);
      const durationSegments: string[] = [];
      if (durationHours > 0) {
        durationSegments.push(`${durationHours} hour${durationHours === 1 ? '' : 's'}`);
      }
      if (durationMinutes > 0) {
        durationSegments.push(`${durationMinutes} minute${durationMinutes === 1 ? '' : 's'}`);
      }
      if (durationSegments.length === 0) {
        durationSegments.push('0 minutes');
      }
      const durationDescription = durationSegments.join(' ');

      // const promptText = `Can I park here? Today is ${formattedDayTime}, and I want to park for ${durationDescription}. Give me a yes or no and only give more detail if my parking duration overlaps with restriction that would result in a tow or ticket.`;

      const promptText = `Can I park here? Today is ${formattedDayTime}, and I want to park for ${durationDescription}. Give me a yes or no as first part of the response. Next part of response should be short detail summary reasoning if my parking duration overlaps with restriction that would result in a tow or ticket.`;
      console.log('Prompt text ->', promptText);

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4.1',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptText,
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${image.base64}`,
                  },
                },
              ],
            },
          ],
        }),
      });

      // console.log('response:', response)
      const data = await response.json();
      // console.log('data variable:', data)
      console.log("OpenAI token usage", data.usage);
      const message = data?.choices?.[0]?.message?.content || 'No response';
      setResult(message);
      setShowResult(true);
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      setResult('Something went wrong while analyzing the sign.');
      setShowResult(true);
    } finally {
      setIsLoading(false);
    }
  };

  const hasImage = Boolean(image);

  return (
    <>
      <ScrollView contentContainerStyle={styles.container} style={styles.scroll}>
        <View style={styles.content}>
          <Text style={styles.title}>Can I Park Here?</Text>

          <View style={styles.dateTimeBlock}>
            <Text style={styles.dateText}>{formatDateLine(selectedDate)}</Text>
            <Text style={styles.timeText}>{formatTimeLine(selectedDate)}</Text>
          </View>

          {hasImage ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: image.uri }} style={styles.imagePreview} resizeMode="cover" />
              <TouchableOpacity style={styles.retakeButton} onPress={pickImage}>
                <Text style={styles.retakeText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.captureButton} onPress={pickImage}>
              <Ionicons name="camera" size={22} color="#1A73E8" />
              <Text style={styles.captureText}>Take Picture of Sign</Text>
            </TouchableOpacity>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parking Duration</Text>
          </View>

          <View style={styles.durationPickerCard}>
            <View style={styles.pickerRow}>
              <Picker
                selectedValue={durationHours}
                onValueChange={(value) => setDurationHours(Number(value))}
                style={styles.durationPicker}
                itemStyle={styles.pickerItem}
              >
                {hourOptions.map((hour) => (
                  <Picker.Item key={`hour-${hour}`} label={`${hour}`} value={hour} />
                ))}
              </Picker>
              <Text style={styles.pickerLabel}>h</Text>
              <Picker
                selectedValue={durationMinutes}
                onValueChange={(value) => setDurationMinutes(Number(value))}
                style={styles.durationPicker}
                itemStyle={styles.pickerItem}
              >
                {minuteOptions.map((minute) => (
                  <Picker.Item
                    key={`minute-${minute}`}
                    label={minute.toString().padStart(2, '0')}
                    value={minute}
                  />
                ))}
              </Picker>
              <Text style={styles.pickerLabel}>min</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!hasImage || isLoading) && styles.primaryButtonDisabled,
            ]}
            onPress={analyzeParking}
            disabled={!hasImage || isLoading}
          >
            <Text style={styles.primaryButtonText}>
              {isLoading ? 'Checking…' : 'Find Out'}
            </Text>
          </TouchableOpacity>
          {isLoading && <Text style={styles.loadingHint}>Analyzing parking sign…</Text>}
        </View>
      </ScrollView>

      {showResult && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Parking Guidance</Text>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.modalText}>{result}</Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowResult(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 36,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1B1E',
  },
  dateTimeBlock: {
    alignItems: 'center',
    marginTop: 12,
  },
  dateText: {
    fontSize: 18,
    color: '#1A1B1E',
  },
  timeText: {
    fontSize: 16,
    color: '#1A1B1E',
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 28,
  },
  imagePreview: {
    width: 200,
    height: 200,
    borderRadius: 16,
    backgroundColor: '#F2F4F7',
  },
  retakeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 12,
  },
  retakeText: {
    fontSize: 16,
    color: '#1A73E8',
    fontWeight: '500',
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 1,
    borderRadius: 14,
    borderColor: '#1A73E8',
    backgroundColor: '#F8FAFF',
    marginTop: 28,
  },
  captureText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1A73E8',
    marginLeft: 8,
  },
  sectionHeader: {
    width: '100%',
    marginTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1B1E',
  },
  durationPickerCard: {
    width: '100%',
    borderRadius: 18,
    backgroundColor: '#F2F4F7',
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginTop: 10,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationPicker: {
    flex: 1,
    color: 'black',
    height: 120,
  },
  pickerItem: {
    height: 120,
    fontSize: 20,
    color: '#1A1B1E',
  },
  pickerLabel: {
    width: 40,
    textAlign: 'center',
    fontSize: 16,
    color: '#1A1B1E',
    fontWeight: '500',
    marginHorizontal: 4,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 100,
    gap: 16,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#A8C6F7',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  loadingHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#1A1B1E',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 20,
    backgroundColor: '#fff',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1B1E',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalBody: {
    maxHeight: 220,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1A1B1E',
  },
  modalButton: {
    marginTop: 24,
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#1A73E8',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
