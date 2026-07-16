'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabaseClient, logActivity } from '@/lib/supabase';

export default function HomePage() {
  const [isOpen, setIsOpen] = useState(false);
  const [messageText, setMessageText] = useState('Loading your sweet message...');

  useEffect(() => {
    // Log visit
    logActivity('Site Visit', 'Home Page');

    // Fetch the dynamic message
    async function fetchMessage() {
      try {
        const { data, error } = await supabaseClient
          .from('letter_content')
          .select('message')
          .limit(1)
          .single();

        if (error) {
          console.error(error);
          setMessageText("Couldn't read message. Make sure Database is set up.");
          return;
        }

        if (data && data.message) {
          setMessageText(data.message);
        } else {
          setMessageText("Couldn't read message. Make sure Database is set up.");
        }
      } catch (err) {
        console.error(err);
        setMessageText("Failed to load message.");
      }
    }

    fetchMessage();
  }, []);

  const handleHeartClick = () => {
    setIsOpen(!isOpen);
    logActivity('Heart Click', isOpen ? 'Close Letter' : 'Open Letter');
  };

  const handleButtonClick = () => {
    logActivity('Button Click', 'Things to Remember');
  };

  // Heart container styles based on isOpen state
  const heartContainerStyle = isOpen
    ? {
        transform: 'translateX(-50%) scale(0.8)',
        top: '85%',
      }
    : {
        transform: 'translateX(-50%)',
        top: '30%',
      };

  const heartStyle = isOpen
    ? {
        animation: 'heartbeat 1.2s ease-in-out infinite',
      }
    : {};

  const containerStyle = isOpen
    ? {
        background: 'var(--primary-pink)',
      }
    : {};

  return (
    <div className="home-container" style={containerStyle}>
      <div 
        className="heart-container" 
        onClick={handleHeartClick} 
        style={heartContainerStyle}
      >
        <div className="heart" style={heartStyle}>
          <svg viewBox="0 0 32 29.6" fill="#e91e63">
            <path d="M23.6,0c-3.4,0-6.3,2.7-7.6,5.6C14.7,2.7,11.8,0,8.4,0C3.8,0,0,3.8,0,8.4c0,9.4,9.5,11.9,16,21.2c6.1-9.3,16-12.1,16-21.2C32,3.8,28.2,0,23.6,0z" />
          </svg>
        </div>
      </div>

      <article className={`message ${isOpen ? 'active' : ''}`}>
        <header>
          <h1 id="message-title" style={{ textAlign: 'left' }}>Hi, Baby</h1>
        </header>
        <div className="content">
          <p id="message-body">{messageText}</p>
          <p style={{ textAlign: 'right', marginTop: '2rem' }}>
            <Link 
              href="/pic" 
              className="btn" 
              onClick={handleButtonClick}
            >
              Things to remember
            </Link>
          </p>
        </div>
      </article>
    </div>
  );
}
