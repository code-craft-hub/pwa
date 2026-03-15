export interface Quote {
  id: string;
  text: string;
  author: string;
  category: "motivation" | "wisdom" | "success" | "mindset" | "learning";
}

const QUOTES: Quote[] = [
  // Motivation
  { id: "m1", text: "The only way to do great work is to love what you do.", author: "Steve Jobs", category: "motivation" },
  { id: "m2", text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius", category: "motivation" },
  { id: "m3", text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair", category: "motivation" },
  { id: "m4", text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill", category: "motivation" },
  { id: "m5", text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt", category: "motivation" },
  { id: "m6", text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "motivation" },
  { id: "m7", text: "It always seems impossible until it's done.", author: "Nelson Mandela", category: "motivation" },
  { id: "m8", text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky", category: "motivation" },
  { id: "m9", text: "Whether you think you can or think you can't, you're right.", author: "Henry Ford", category: "motivation" },
  { id: "m10", text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn", category: "motivation" },

  // Wisdom
  { id: "w1", text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", category: "wisdom" },
  { id: "w2", text: "Life is what happens when you're busy making other plans.", author: "John Lennon", category: "wisdom" },
  { id: "w3", text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu", category: "wisdom" },
  { id: "w4", text: "That which does not kill us makes us stronger.", author: "Friedrich Nietzsche", category: "wisdom" },
  { id: "w5", text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa", category: "wisdom" },
  { id: "w6", text: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt", category: "wisdom" },
  { id: "w7", text: "Always remember that you are absolutely unique. Just like everyone else.", author: "Margaret Mead", category: "wisdom" },
  { id: "w8", text: "Do not go where the path may lead, go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson", category: "wisdom" },
  { id: "w9", text: "You will face many defeats in life, but never let yourself be defeated.", author: "Maya Angelou", category: "wisdom" },
  { id: "w10", text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela", category: "wisdom" },

  // Success
  { id: "s1", text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau", category: "success" },
  { id: "s2", text: "Opportunities don't happen. You create them.", author: "Chris Grosser", category: "success" },
  { id: "s3", text: "I find that the harder I work, the more luck I seem to have.", author: "Thomas Jefferson", category: "success" },
  { id: "s4", text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson", category: "success" },
  { id: "s5", text: "The secret of getting ahead is getting started.", author: "Mark Twain", category: "success" },
  { id: "s6", text: "Success is walking from failure to failure with no loss of enthusiasm.", author: "Winston Churchill", category: "success" },
  { id: "s7", text: "Too many of us are not living our dreams because we are living our fears.", author: "Les Brown", category: "success" },
  { id: "s8", text: "I have not failed. I've just found 10,000 ways that won't work.", author: "Thomas A. Edison", category: "success" },
  { id: "s9", text: "If you genuinely want something, don't wait for it — teach yourself to be impatient.", author: "Gurbaksh Chahal", category: "success" },
  { id: "s10", text: "A successful man is one who can lay a firm foundation with the bricks others have thrown at him.", author: "David Brinkley", category: "success" },

  // Mindset
  { id: "mn1", text: "Your mindset is the key that unlocks all the doors you face.", author: "Unknown", category: "mindset" },
  { id: "mn2", text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus", category: "mindset" },
  { id: "mn3", text: "What you think, you become. What you feel, you attract. What you imagine, you create.", author: "Buddha", category: "mindset" },
  { id: "mn4", text: "The mind is everything. What you think you become.", author: "Buddha", category: "mindset" },
  { id: "mn5", text: "Once you replace negative thoughts with positive ones, you'll start having positive results.", author: "Willie Nelson", category: "mindset" },
  { id: "mn6", text: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman", category: "mindset" },
  { id: "mn7", text: "Limitations live only in our minds. But if we use our imaginations, our possibilities become limitless.", author: "Jamie Paolinetti", category: "mindset" },
  { id: "mn8", text: "You become what you believe.", author: "Oprah Winfrey", category: "mindset" },
  { id: "mn9", text: "Change your thoughts and you change your world.", author: "Norman Vincent Peale", category: "mindset" },
  { id: "mn10", text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson", category: "mindset" },

  // Learning
  { id: "l1", text: "Live as if you were to die tomorrow. Learn as if you were to live forever.", author: "Mahatma Gandhi", category: "learning" },
  { id: "l2", text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", category: "learning" },
  { id: "l3", text: "The more that you read, the more things you will know. The more that you learn, the more places you'll go.", author: "Dr. Seuss", category: "learning" },
  { id: "l4", text: "An investment in knowledge pays the best interest.", author: "Benjamin Franklin", category: "learning" },
  { id: "l5", text: "Anyone who stops learning is old, whether at twenty or eighty.", author: "Henry Ford", category: "learning" },
  { id: "l6", text: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King", category: "learning" },
  { id: "l7", text: "Tell me and I forget. Teach me and I remember. Involve me and I learn.", author: "Benjamin Franklin", category: "learning" },
  { id: "l8", text: "Intelligence plus character — that is the goal of true education.", author: "Martin Luther King Jr.", category: "learning" },
  { id: "l9", text: "The capacity to learn is a gift; the ability to learn is a skill; the willingness to learn is a choice.", author: "Brian Herbert", category: "learning" },
  { id: "l10", text: "Develop a passion for learning. If you do, you will never cease to grow.", author: "Anthony J. D'Angelo", category: "learning" },
];

/**
 * Returns a random quote on every call — used for the 5-second polling feed.
 */
export function getRandomQuote(): Quote {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
}

/**
 * Returns a deterministic quote for the current calendar day.
 * Stable within a day; rotates at midnight UTC.
 */
export function getQuoteOfTheDay(): Quote {
  const now = new Date();
  const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 0));
  const dayOfYear = Math.floor(
    (now.getTime() - startOfYear.getTime()) / 86_400_000
  );
  return QUOTES[dayOfYear % QUOTES.length];
}

export { QUOTES };
