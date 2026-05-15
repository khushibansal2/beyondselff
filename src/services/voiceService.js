/**
 * Voice Input Service using Web Speech API
 */
export function createVoiceRecognition(onResult, onError, onEnd) {
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-IN";

  recognition.onstart = () => {
    console.log("Voice recognition started");
  };

  recognition.onresult = (event) => {
    let interimTranscript = "";
    let finalTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    onResult({ finalTranscript, interimTranscript });
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);

    if (onError) {
      onError(event.error);
    }
  };

  recognition.onend = () => {
    console.log("Voice recognition ended");

    if (onEnd) {
      onEnd();
    }
  };

  return recognition;
}