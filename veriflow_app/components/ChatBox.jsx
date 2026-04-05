import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  Alert,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";

const ChatBox = ({ apiUrl = "https://precosmic-charlene-germfree.ngrok-free.dev/chat" }) => {
  const [message, setMessage] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const sendMessage = async (text) => {
    const userMessage = (text || message).trim();
    if (!userMessage) return;

    setMessage("");
    setChatMessages((prev) => [...prev, { type: "user", text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);

      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        { type: "bot", text: data.reply || data.answer || "No response received." },
      ]);
    } catch (error) {
      console.error("Error sending query:", error);
      setChatMessages((prev) => [
        ...prev,
        { type: "bot", text: "Sorry, I couldn't process your request. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission Required", "Please allow microphone access to use voice input.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setIsRecording(false);
    setLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setChatMessages((prev) => [...prev, { type: "user", text: "[Voice Message]" }]);

      const formData = new FormData();
      formData.append("audio", { uri, type: "audio/wav", name: "recording.wav" });

      const response = await fetch(apiUrl.replace("/chat", "/query-with-audio"), {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      setChatMessages((prev) => [
        ...prev,
        { type: "bot", text: data.reply || data.answer },
      ]);
    } catch (error) {
      console.error("Error processing voice query:", error);
      setChatMessages((prev) => [
        ...prev,
        { type: "bot", text: "Sorry, I couldn't process your voice message. Please try again." },
      ]);
    } finally {
      setRecording(null);
      setLoading(false);
    }
  };

  const SUGGESTIONS = [
    "What is Blue Carbon?",
    "How do I register a plot?",
    "How much can I earn?",
    "What is a carbon credit?",
    "How do I sell credits?",
  ];

  return (
    <>
      {!isChatOpen && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={() => setIsChatOpen(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal
        visible={isChatOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsChatOpen(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.chatContainer}>

            {/* Header */}
            <View style={styles.chatHeader}>
              <Text style={styles.chatHeaderText}>FAQ Assistant</Text>
              <TouchableOpacity onPress={() => setIsChatOpen(false)}>
                <Ionicons name="close" size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Messages */}
            <ScrollView
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
            >
              {chatMessages.length === 0 && (
                <View>
                  <Text style={styles.emptyText}>
                    Ask me anything about Blue Carbon!
                  </Text>
                  <View style={styles.suggestionsContainer}>
                    {SUGGESTIONS.map((q, i) => (
                      <TouchableOpacity
                        key={i}
                        style={styles.suggestionBtn}
                        onPress={() => sendMessage(q)}
                      >
                        <Text style={styles.suggestionText}>{q}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {chatMessages.map((msg, index) => (
                <View
                  key={index}
                  style={[
                    styles.messageBubble,
                    msg.type === "user" ? styles.userBubble : styles.botBubble,
                  ]}
                >
                  <Text
                    style={[
                      styles.messageText,
                      msg.type === "user" ? styles.userText : styles.botText,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}

              {loading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#4dff4d" />
                  <Text style={styles.loadingText}>Thinking...</Text>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Type your question..."
                placeholderTextColor="#999"
                value={message}
                onChangeText={setMessage}
                editable={!loading && !isRecording}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[styles.voiceButton, isRecording && styles.voiceButtonActive]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={loading}
                activeOpacity={0.7}
              >
                <Ionicons name={isRecording ? "stop-circle" : "mic"} size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sendButton}
                onPress={() => sendMessage()}
                disabled={loading || !message.trim() || isRecording}
                activeOpacity={0.7}
              >
                <Ionicons name="send" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#be005c",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  chatContainer: {
    height: "80%",
    backgroundColor: "#0a1a0a",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
    borderTopWidth: 1,
    borderTopColor: "#2a3e2a",
  },
  chatHeader: {
    backgroundColor: "#1a2e1a",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#2a3e2a",
  },
  chatHeaderText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: "#0d1f0d",
  },
  messagesContent: {
    padding: 16,
  },
  emptyText: {
    textAlign: "center",
    color: "#aaaaaa",
    fontSize: 16,
    marginTop: 20,
    marginBottom: 16,
  },
  suggestionsContainer: {
    gap: 8,
    marginTop: 4,
  },
  suggestionBtn: {
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#4dff4d",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  suggestionText: {
    color: "#4dff4d",
    fontSize: 13,
    textAlign: "center",
  },
  messageBubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#4dff4d",
  },
  botBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#2a3e2a",
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  userText: {
    color: "#000000",
  },
  botText: {
    color: "#FFFFFF",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#1a2e1a",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a3e2a",
  },
  loadingText: {
    marginLeft: 8,
    color: "#aaaaaa",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: "#0a1a0a",
    borderTopWidth: 1,
    borderTopColor: "#2a3e2a",
    alignItems: "center",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#142514",
    borderWidth: 1,
    borderColor: "#2a3e2a",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
    maxHeight: 100,
    color: "#FFFFFF",
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1a2e1a",
    borderWidth: 1,
    borderColor: "#2a3e2a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  voiceButtonActive: {
    backgroundColor: "#6b1f1f",
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#4dff4d",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ChatBox;