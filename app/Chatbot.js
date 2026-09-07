'use client';

import { useState, useRef } from 'react';

export default function Home() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const playAudio = async (text) => {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      console.error('Audio playback failed:', err);
    }
  };

  const handleSendText = async (textToSend) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const newHistory = [...messages, { role: 'user', content: query }];
    setMessages(newHistory);
    setInputText('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history: messages }),
      });
      const data = await res.json();

      if (data.reply) {
        setMessages([...newHistory, { role: 'assistant', content: data.reply }]);
        playAudio(data.reply);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.webm');

        setLoading(true);
        try {
          const res = await fetch('/api/stt', { method: 'POST', body: formData });
          const data = await res.json();
          if (data.text) {
            handleSendText(data.text);
          }
        } catch (err) {
          console.error('STT Error:', err);
          setLoading(false);
        }
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied or unsupported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <main className="min-h-screen bg-amber-50 p-4 max-w-2xl mx-auto flex flex-col justify-between">
      <header className="py-4 text-center border-b border-amber-200">
        <h1 className="text-2xl font-bold text-amber-900">নমস্কাৰ (Assamese Voice Companion)</h1>
        <p className="text-sm text-amber-700">সহায়িকা সংগী</p>
      </header>

      <div className="flex-1 overflow-y-auto py-6 space-y-4 my-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 my-10">
            কথা পাতিবলৈ মাইক্ৰ'ফোন বুটামত টিপক (Press record to talk)
          </div>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl max-w-[85%] text-lg leading-relaxed ${
              m.role === 'user'
                ? 'bg-amber-600 text-white ml-auto rounded-br-none'
                : 'bg-white text-gray-800 border border-amber-200 mr-auto rounded-bl-none shadow-sm'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="text-center text-amber-700 animate-pulse">ভাৱি থকা হৈছে...</p>}
      </div>

      <div className="space-y-4 bg-white p-4 rounded-3xl shadow-md border border-amber-100">
        <div className="flex justify-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-24 h-24 rounded-full font-bold text-white text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center ${
              isRecording ? 'bg-red-500 animate-ping' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {isRecording ? 'Stop' : '🎤 Speak'}
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="অথবা ইয়াত লিখক (Or type here...)"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
          />
          <button
            onClick={() => handleSendText()}
            className="bg-amber-800 text-white px-6 py-3 rounded-xl font-medium"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}