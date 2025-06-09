import React, { useState } from 'react';

interface EmailKeypadModalProps {
  onComplete: (email: string) => void;
  onCancel: () => void;
}

const QWERTY_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'backspace'],
  ['123', 'space', 'return'],
];

const NUMERIC_ROW = ['1','2','3','4','5','6','7','8','9','0','@','.','_','-'];

export const EmailKeypadModal: React.FC<EmailKeypadModalProps> = ({ onComplete, onCancel }) => {
  const [email, setEmail] = useState('');
  const [shift, setShift] = useState(false);
  const [showNumeric, setShowNumeric] = useState(false);

  const handleKeyPress = (key: string) => {
    if (key === 'shift') {
      setShift((s) => !s);
      return;
    }
    if (key === 'backspace') {
      setEmail((prev) => prev.slice(0, -1));
      return;
    }
    if (key === 'space') {
      setEmail((prev) => prev + ' ');
      return;
    }
    if (key === 'return') {
      onComplete(email);
      return;
    }
    if (key === '123') {
      setShowNumeric(true);
      return;
    }
    if (key === 'ABC') {
      setShowNumeric(false);
      return;
    }
    setEmail((prev) => prev + key);
    if (shift) setShift(false);
  };

  return (
    <div className="w-full pb-3" style={{background: '#fff', borderTopLeftRadius: 18, borderTopRightRadius: 18, boxShadow: '0 -2px 12px rgba(0,0,0,0.08)', padding: '8px 0 0 0'}}>
      <div className="flex flex-col items-center w-full" style={{maxWidth: 375, margin: '0 auto'}}>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-[90%] p-2 border border-gray-300 rounded-lg mb-1 text-base text-center bg-gray-50"
          placeholder="Enter email"
          style={{maxWidth: 320}}
        />
        <div className="w-full flex flex-col items-center" style={{maxWidth: 340}}>
          {showNumeric ? (
            <div className="grid grid-cols-7 gap-1 mb-1 w-full">
              {NUMERIC_ROW.map((key) => (
                <button
                  key={key}
                  onClick={() => handleKeyPress(key)}
                  className="bg-white rounded-lg shadow text-base font-semibold py-1 px-0.5 border border-gray-200 active:bg-gray-200"
                  style={{minWidth: 26, minHeight: 36}}
                >
                  {key}
                </button>
              ))}
              <button
                onClick={() => handleKeyPress('ABC')}
                className="col-span-2 bg-gray-200 rounded-lg shadow text-sm font-semibold py-1 border border-gray-200 active:bg-gray-300"
                style={{minHeight: 36}}
              >
                ABC
              </button>
              <button
                onClick={() => handleKeyPress('backspace')}
                className="col-span-2 bg-gray-200 rounded-lg shadow text-sm font-semibold py-1 border border-gray-200 active:bg-gray-300"
                style={{minHeight: 36}}
              >
                ⌫
              </button>
            </div>
          ) : (
            QWERTY_ROWS.map((row, i) => (
              <div key={i} className="flex justify-center gap-1 mb-1 w-full">
                {row.map((key) => {
                  if (key === 'shift') {
                    return (
                      <button
                        key={key}
                        onClick={() => handleKeyPress('shift')}
                        className={`bg-gray-200 rounded-lg shadow text-sm font-semibold py-1 px-2 border border-gray-200 active:bg-gray-300 ${shift ? 'bg-blue-200' : ''}`}
                        style={{minWidth: 30, minHeight: 36}}
                      >
                        ⇧
                      </button>
                    );
                  }
                  if (key === 'backspace') {
                    return (
                      <button
                        key={key}
                        onClick={() => handleKeyPress('backspace')}
                        className="bg-gray-200 rounded-lg shadow text-sm font-semibold py-1 px-2 border border-gray-200 active:bg-gray-300"
                        style={{minWidth: 30, minHeight: 36}}
                      >
                        ⌫
                      </button>
                    );
                  }
                  if (key === '123') {
                    return (
                      <button
                        key={key}
                        onClick={() => handleKeyPress('123')}
                        className="bg-gray-200 rounded-lg shadow text-sm font-semibold py-1 px-2 border border-gray-200 active:bg-gray-300"
                        style={{minWidth: 38, minHeight: 36}}
                      >
                        123
                      </button>
                    );
                  }
                  if (key === 'space') {
                    return (
                      <button
                        key={key}
                        onClick={() => handleKeyPress('space')}
                        className="flex-1 bg-white rounded-lg shadow text-sm font-semibold py-1 px-6 border border-gray-200 active:bg-gray-200 mx-1"
                        style={{minWidth: 60, minHeight: 36}}
                      >
                        space
                      </button>
                    );
                  }
                  if (key === 'return') {
                    return (
                      <button
                        key={key}
                        onClick={() => handleKeyPress('return')}
                        className="bg-blue-500 text-white rounded-lg shadow text-sm font-semibold py-1 px-3 border border-blue-600 active:bg-blue-600"
                        style={{minWidth: 48, minHeight: 36}}
                      >
                        return
                      </button>
                    );
                  }
                  return (
                    <button
                      key={key}
                      onClick={() => handleKeyPress(shift ? key : key.toLowerCase())}
                      className="bg-white rounded-lg shadow text-base font-semibold py-1 px-2 border border-gray-200 active:bg-gray-200"
                      style={{minWidth: 26, minHeight: 36}}
                    >
                      {shift ? key : key.toLowerCase()}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="flex justify-between w-full mt-1 px-2" style={{maxWidth: 320}}>
          <button
            onClick={onCancel}
            className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-1 text-gray-700 font-semibold shadow text-sm"
            style={{minWidth: 60}}
          >
            Cancel
          </button>
          <button
            onClick={() => onComplete(email)}
            className="bg-blue-500 text-white border border-blue-600 rounded-lg px-3 py-1 font-semibold shadow text-sm"
            style={{minWidth: 60}}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}; 