import { ChangeEvent, FormEvent, KeyboardEvent } from 'react';

interface Props {
  userInput: string;
  isProcessing: boolean;
  onInputChange: (e: ChangeEvent<HTMLInputElement>) => void;
  onKeyPress: (e: KeyboardEvent<HTMLInputElement>) => void;
  onSubmit: (e: FormEvent) => void;
}

export default function MatrixRPGInput({
  userInput, isProcessing, onInputChange, onKeyPress, onSubmit
}: Props) {
  return (
    <form className="matrix-rpg-input-form" onSubmit={onSubmit}>
      <div className="matrix-rpg-input-container">
        <span className="matrix-rpg-input-prompt">&gt;</span>
        <input
          type="text"
          className="matrix-rpg-input"
          value={userInput}
          onChange={onInputChange}
          onKeyPress={onKeyPress}
          placeholder=">_"
          disabled={isProcessing}
          autoFocus
        />
      </div>
      <button 
        type="submit" 
        className="matrix-rpg-submit-btn"
        disabled={isProcessing || !userInput.trim()}
      >
        {isProcessing ? 'TRANSMITTING...' : 'TRANSMIT'}
      </button>
    </form>
  );
} 