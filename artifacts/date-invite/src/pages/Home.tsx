import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLogVisit } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { CalendarIcon, ChevronDown } from 'lucide-react';

import envelopeImg from '../assets/envelope.png';
import bobaImg from '../assets/boba.png';

type Screen = 'ask' | 'yes' | 'boba' | 'boba_when' | 'boba_plan' | 'when' | 'feeling' | 'plan';

const TIME_OPTIONS = [
  { value: '8:00 AM',  label: '8:00 AM',  desc: 'early bird energy ☀️' },
  { value: '9:00 AM',  label: '9:00 AM',  desc: 'good morning sunshine' },
  { value: '10:00 AM', label: '10:00 AM', desc: 'weekend vibes only' },
  { value: '11:00 AM', label: '11:00 AM', desc: 'brunch hours 🥂' },
  { value: '12:00 PM', label: '12:00 PM', desc: 'lunchtime 🍽️' },
  { value: '1:00 PM',  label: '1:00 PM',  desc: 'afternoon adventure' },
  { value: '2:00 PM',  label: '2:00 PM',  desc: 'golden hour soon' },
  { value: '3:00 PM',  label: '3:00 PM',  desc: 'the perfect start' },
  { value: '4:00 PM',  label: '4:00 PM',  desc: 'late afternoon stroll' },
  { value: '5:00 PM',  label: '5:00 PM',  desc: 'we eating with the retirees' },
  { value: '6:00 PM',  label: '6:00 PM',  desc: 'this is the right answer tbh' },
  { value: '7:00 PM',  label: '7:00 PM',  desc: "you're making me hungry already" },
  { value: '8:00 PM',  label: '8:00 PM',  desc: 'we eating dinner or breakfast?' },
  { value: '9:00 PM',  label: '9:00 PM',  desc: 'late night fun fun 🌙' },
];

const ACTIVITIES = [
  { id: 'pizza',       label: 'Pizza',       emoji: '🍕' },
  { id: 'pasta',       label: 'Pasta',       emoji: '🍝' },
  { id: 'ramen',       label: 'Ramen',       emoji: '🍜' },
  { id: 'sushi',       label: 'Sushi',       emoji: '🍣' },
  { id: 'boba',        label: 'Boba',        emoji: '🧋' },
  { id: 'hike',        label: 'Hike',        emoji: '🥾' },
  { id: 'pickleball',  label: 'Pickleball',  emoji: '🏓' },
  { id: 'beach',       label: 'Beach',       emoji: '🏖️' },
  { id: 'park',        label: 'Park',        emoji: '🌳' },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>('ask');
  const [noCount, setNoCount] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);
  const { toast } = useToast();

  // When screen state
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);

  // Feeling screen state
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const logVisitMutation = useLogVisit();

  // Absolute positions within the 342×260 button container
  // Both start side-by-side and centered vertically
  const [noPos, setNoPos] = useState({ x: 219, y: 108 });
  const [yesPos, setYesPos] = useState({ x: 24, y: 102 });

  useEffect(() => {
    setTimeSpent(0);
    timerRef.current = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [screen]);

  const transitionTo = (nextScreen: Screen, finalAnswer: string | null = null) => {
    logVisitMutation.mutate({
      data: {
        page: screen,
        timeSpentSeconds: timeSpent,
        userAgent: navigator.userAgent,
        noCount: screen === 'ask' ? noCount : null,
        finalAnswer,
      },
    });
    setScreen(nextScreen);
  };

  useEffect(() => {
    logVisitMutation.mutate({
      data: { page: 'ask', timeSpentSeconds: 0, userAgent: navigator.userAgent },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Container 342×260, button approx sizes (both ~90% parity):
  // Yes ≈ 165px × 56px → safe x: [0,177], y: [0,204]
  // No  ≈ 148px × 50px → safe x: [0,194], y: [0,210]
  const rand = (min: number, max: number) => Math.random() * (max - min) + min;

  const nonOverlapPositions = () => {
    for (let i = 0; i < 30; i++) {
      const yp = { x: rand(0, 177), y: rand(0, 204) };
      const np = { x: rand(0, 194), y: rand(0, 210) };
      // Bounding-box gap check (16px margin)
      const apart =
        yp.x + 165 + 16 < np.x ||
        np.x + 148 + 16 < yp.x ||
        yp.y + 56  + 16 < np.y ||
        np.y + 50  + 16 < yp.y;
      if (apart) return { yp, np };
    }
    // Fallback: top / bottom split
    return { yp: { x: rand(0, 177), y: 0 }, np: { x: rand(0, 194), y: 210 } };
  };

  const handleNoClick = () => {
    const nextCount = noCount + 1;
    if (nextCount >= 4) {
      transitionTo('boba', 'boba_offer');
    } else {
      setNoCount(nextCount);
      const { yp, np } = nonOverlapPositions();
      setYesPos(yp);
      setNoPos(np);
    }
  };

  const handleYesClick = () => transitionTo('yes', 'yes');

  const toggleActivity = (id: string) => {
    setSelectedActivities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const activityLabel = selectedActivities.length > 0
    ? selectedActivities.map((id) => ACTIVITIES.find((a) => a.id === id)?.label).join(', ')
    : 'something fun';

  const dateLabel = selectedDate ? format(selectedDate, 'EEEE, MMMM do') : 'TBD';
  const timeLabel = selectedTime || 'TBD';

  const handleBobaCopy = () => {
    const message = `cool cool 🧋\n\nboba run: ${dateLabel} at ${timeLabel}\njust as friends obv`;
    const smsUrl = `sms:&body=${encodeURIComponent(message)}`;
    const a = document.createElement('a');
    a.href = smsUrl;
    a.click();
    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Copied! 🧋' });
    }).catch(() => {
      toast({ title: 'Opening texts! 🧋' });
    });
  };

  const handleCopyPlan = () => {
    const message = `it's a date! 💌\n\nwe're doing: ${activityLabel} ${selectedActivities.map((id) => ACTIVITIES.find((a) => a.id === id)?.emoji).join('')}\nwhen: ${dateLabel} at ${timeLabel}`;
    // Try iMessage / SMS deep link first on mobile
    const smsUrl = `sms:&body=${encodeURIComponent(message)}`;
    const a = document.createElement('a');
    a.href = smsUrl;
    a.click();
    // Also copy to clipboard as fallback
    navigator.clipboard.writeText(message).then(() => {
      toast({ title: 'Copied! 💕', description: 'Message copied + opening texts!' });
    }).catch(() => {
      toast({ title: 'Opening texts! 💕' });
    });
  };

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-[100dvh] relative overflow-hidden bg-background flex flex-col items-center justify-center p-6 text-center shadow-xl">
      <AnimatePresence mode="wait">

        {/* ── SCREEN 1: ASK ── */}
        {screen === 'ask' && (
          <motion.div
            key="ask"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center w-full relative z-10"
          >
            <motion.img
              src={envelopeImg}
              alt="Love letter"
              className="w-48 h-48 object-contain mb-8"
              animate={{ y: [0, -10, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            />
            <h1 className="font-serif text-4xl font-semibold text-primary mb-12 leading-tight">
              Will you go on a date with me?
            </h1>
            {/* Fixed 260px tall container — both buttons absolutely positioned within it */}
            <div className="relative w-full h-[260px]">
              <motion.button
                data-testid="button-yes"
                onClick={handleYesClick}
                style={{ position: 'absolute', top: 0, left: 0 }}
                animate={{ x: yesPos.x, y: yesPos.y, scale: 1 + noCount * 0.08 }}
                transition={{ type: 'spring', bounce: 0.6, stiffness: 180 }}
                className="bg-primary text-primary-foreground font-serif text-xl font-medium px-9 py-3.5 rounded-full shadow-lg active:scale-95 z-20"
              >
                Yes ♡
              </motion.button>
              <motion.button
                data-testid="button-no"
                onClick={handleNoClick}
                style={{ position: 'absolute', top: 0, left: 0 }}
                animate={{ x: noPos.x, y: noPos.y, scale: Math.max(0.72, 0.9 - noCount * 0.06) }}
                transition={{ type: 'spring', bounce: 0.5, stiffness: 160 }}
                className="bg-muted text-muted-foreground font-serif text-xl font-medium px-9 py-3.5 rounded-full shadow-sm z-20"
              >
                {noCount === 0 ? 'No' : noCount === 1 ? 'Are you sure?' : noCount === 2 ? 'Really? 🥺' : 'Last chance!'}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* ── SCREEN 2: YES ── */}
        {screen === 'yes' && (
          <motion.div
            key="yes"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center w-full z-10 gap-6"
          >
            {/* Confetti */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(24)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 1, y: -20, left: `${Math.random() * 100}%` }}
                  animate={{ opacity: 0, y: '100vh', rotate: Math.random() * 720 }}
                  transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                  className="absolute top-0 w-3 h-3 rounded-sm"
                  style={{ backgroundColor: ['#ff6b81', '#ffd1dc', '#c084fc', '#fbbf24', '#34d399'][Math.floor(Math.random() * 5)] }}
                />
              ))}
            </div>

            <div className="text-6xl">🎉</div>

            <h1 className="font-serif text-4xl font-bold text-primary leading-tight relative z-10">
              YOU SAID YES??? 🥹
            </h1>
            <p className="font-sans text-foreground text-lg relative z-10">
              im like super happy but ill try to be nonchalant
            </p>

            <button
              data-testid="button-ok"
              onClick={() => transitionTo('when')}
              className="bg-primary text-primary-foreground font-serif text-xl font-medium px-10 py-4 rounded-full shadow-lg active:scale-95 transition-transform z-10 mt-4"
            >
              okay okay! →
            </button>
          </motion.div>
        )}

        {/* ── SCREEN 3: WHEN ── */}
        {screen === 'when' && (
          <motion.div
            key="when"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex flex-col items-center w-full z-10"
          >
            {/* White card */}
            <div className="bg-white rounded-3xl p-7 shadow-sm border border-border w-full flex flex-col gap-5">
              <div className="text-2xl">📓🐾</div>
              <h2 className="font-serif text-3xl font-bold text-primary text-left leading-tight">
                So... when are you free?
              </h2>

              {/* Date picker */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-sm font-semibold text-muted-foreground">
                  Pick a Day ✨
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      data-testid="input-date"
                      className="flex items-center justify-between w-full border border-border rounded-xl px-4 py-3 text-left text-foreground bg-background hover:bg-muted/40 transition-colors font-sans text-base"
                    >
                      <span className={selectedDate ? 'text-foreground' : 'text-muted-foreground'}>
                        {selectedDate ? format(selectedDate, 'MM/dd/yyyy') : 'Pick a date...'}
                      </span>
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => { setSelectedDate(d); setCalendarOpen(false); }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time picker */}
              <div className="flex flex-col gap-1 text-left">
                <label className="text-sm font-semibold text-muted-foreground">
                  What Time? 😅
                </label>
                <div className="relative">
                  <button
                    data-testid="input-time"
                    onClick={() => setTimeOpen((p) => !p)}
                    className="flex items-center justify-between w-full border border-border rounded-xl px-4 py-3 text-left bg-background hover:bg-muted/40 transition-colors font-sans text-base"
                  >
                    <span className={selectedTime ? 'text-foreground' : 'text-muted-foreground'}>
                      {selectedTime
                        ? `${selectedTime} — ${TIME_OPTIONS.find((t) => t.value === selectedTime)?.desc}`
                        : 'Select a time...'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${timeOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {timeOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <button
                            key={t.value}
                            onClick={() => { setSelectedTime(t.value); setTimeOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 font-sans text-sm hover:bg-pink-50 transition-colors border-b border-border/40 last:border-0 ${selectedTime === t.value ? 'bg-pink-50 text-primary font-semibold' : 'text-foreground'}`}
                          >
                            <span className="font-semibold">{t.label}</span>
                            <span className="text-muted-foreground"> — {t.desc}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Next button */}
              <button
                data-testid="button-when-next"
                disabled={!selectedDate || !selectedTime}
                onClick={() => transitionTo('feeling')}
                className="bg-primary text-primary-foreground font-serif text-xl font-medium px-8 py-4 rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                okay next →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── SCREEN 4: FEELING ── */}
        {screen === 'feeling' && (
          <motion.div
            key="feeling"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex flex-col items-center w-full z-10 gap-4"
          >
            <h2 className="font-serif text-3xl font-bold text-primary leading-tight">
              What are we feeling? 🍽️✨
            </h2>
            <p className="font-sans text-sm text-muted-foreground -mt-2">
              (you can pick more than one btw)
            </p>

            <div className="grid grid-cols-3 gap-3 w-full mt-1">
              {ACTIVITIES.map((a) => {
                const selected = selectedActivities.includes(a.id);
                return (
                  <motion.button
                    key={a.id}
                    data-testid={`activity-${a.id}`}
                    onClick={() => toggleActivity(a.id)}
                    whileTap={{ scale: 0.93 }}
                    className={`flex flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 transition-all font-sans text-sm font-medium
                      ${selected
                        ? 'border-primary bg-pink-50 text-primary shadow-md'
                        : 'border-border bg-white text-foreground'}`}
                  >
                    <span className="text-3xl leading-none">{a.emoji}</span>
                    <span>{a.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <button
              data-testid="button-feeling-next"
              disabled={selectedActivities.length === 0}
              onClick={() => transitionTo('plan')}
              className="bg-primary text-primary-foreground font-serif text-xl font-medium px-8 py-4 rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full mt-2"
            >
              this one! →
            </button>
          </motion.div>
        )}

        {/* ── BOBA DETOUR ── */}
        {screen === 'boba' && (
          <motion.div
            key="boba"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center w-full z-10"
          >
            <motion.img
              src={bobaImg}
              alt="Boba cup"
              className="w-40 h-40 object-contain mb-8"
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
            />
            <h1 className="font-serif text-2xl font-medium text-foreground mb-12">
              aw ok. would you be down to grab boba, just as friends?
            </h1>
            <div className="flex flex-col w-full gap-4">
              <button
                data-testid="button-boba-yes"
                onClick={() => transitionTo('boba_when', 'boba_yes')}
                className="bg-primary text-primary-foreground font-serif text-xl font-medium px-8 py-4 rounded-full shadow-lg active:scale-95 transition-transform"
              >
                yeah sure 🧋
              </button>
              <button
                data-testid="button-boba-no"
                onClick={() => {
                  logVisitMutation.mutate({
                    data: { page: 'boba', timeSpentSeconds: timeSpent, finalAnswer: 'boba_no' },
                  });
                  toast({ title: "okay maybe next time! 💕" });
                }}
                className="bg-transparent text-muted-foreground font-sans px-8 py-4 rounded-full active:scale-95 transition-transform"
              >
                maybe later...
              </button>
            </div>
          </motion.div>
        )}

        {/* ── BOBA WHEN ── */}
        {screen === 'boba_when' && (
          <motion.div
            key="boba_when"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            className="flex flex-col items-center w-full z-10"
          >
            <div className="bg-white rounded-3xl p-7 shadow-sm border border-border w-full flex flex-col gap-5">
              <div className="text-2xl">🧋✨</div>
              <h2 className="font-serif text-3xl font-bold text-primary text-left leading-tight">
                When are you free?
              </h2>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-sm font-semibold text-muted-foreground">
                  Pick a Day ✨
                </label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex items-center justify-between w-full border border-border rounded-xl px-4 py-3 text-left text-foreground bg-background hover:bg-muted/40 transition-colors font-sans text-base"
                    >
                      <span className={selectedDate ? 'text-foreground' : 'text-muted-foreground'}>
                        {selectedDate ? format(selectedDate, 'MM/dd/yyyy') : 'Pick a date...'}
                      </span>
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(d) => { setSelectedDate(d); setCalendarOpen(false); }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <label className="text-sm font-semibold text-muted-foreground">
                  What Time? 😅
                </label>
                <div className="relative">
                  <button
                    onClick={() => setTimeOpen((p) => !p)}
                    className="flex items-center justify-between w-full border border-border rounded-xl px-4 py-3 text-left bg-background hover:bg-muted/40 transition-colors font-sans text-base"
                  >
                    <span className={selectedTime ? 'text-foreground' : 'text-muted-foreground'}>
                      {selectedTime
                        ? `${selectedTime} — ${TIME_OPTIONS.find((t) => t.value === selectedTime)?.desc}`
                        : 'Select a time...'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${timeOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {timeOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="absolute left-0 right-0 top-full mt-1 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-56 overflow-y-auto"
                      >
                        {TIME_OPTIONS.map((t) => (
                          <button
                            key={t.value}
                            onClick={() => { setSelectedTime(t.value); setTimeOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 font-sans text-sm hover:bg-pink-50 transition-colors border-b border-border/40 last:border-0 ${selectedTime === t.value ? 'bg-pink-50 text-primary font-semibold' : 'text-foreground'}`}
                          >
                            <span className="font-semibold">{t.label}</span>
                            <span className="text-muted-foreground"> — {t.desc}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <button
                disabled={!selectedDate || !selectedTime}
                onClick={() => transitionTo('boba_plan')}
                className="bg-primary text-primary-foreground font-serif text-xl font-medium px-8 py-4 rounded-full shadow-lg active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed mt-2"
              >
                okay next →
              </button>
            </div>
          </motion.div>
        )}

        {/* ── BOBA PLAN ── */}
        {screen === 'boba_plan' && (
          <motion.div
            key="boba_plan"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center w-full text-left z-10"
          >
            <h1 className="font-serif text-4xl font-semibold text-primary mb-2 self-start w-full">
              Cool cool, looking forward to boba 🧋
            </h1>
            <p className="font-sans text-xs italic text-muted-foreground mb-6 w-full self-start">
              p.s. just as friends. obviously.
            </p>

            <div className="bg-white w-full rounded-3xl p-6 shadow-sm border border-border mb-8 flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground tracking-wider mb-1">WHEN</p>
                <p className="font-serif text-xl text-primary">{dateLabel}</p>
                <p className="font-sans text-foreground">at {timeLabel}</p>
              </div>
              <div className="h-px w-full bg-border" />
              <div>
                <p className="text-xs font-bold text-muted-foreground tracking-wider mb-1">VIBE</p>
                <p className="font-serif text-xl text-primary">boba, just as friends 🧋</p>
              </div>
            </div>

            <button
              onClick={handleBobaCopy}
              className="bg-primary text-primary-foreground font-serif text-xl font-medium px-8 py-4 w-full rounded-full shadow-lg active:scale-95 transition-transform mb-6 flex items-center justify-center gap-2"
            >
              <span>📋</span> Copy plan &amp; text me
            </button>
          </motion.div>
        )}

        {/* ── SCREEN 5: PLAN / IT'S A DATE ── */}
        {screen === 'plan' && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center w-full text-left z-10"
          >
            <h1 className="font-serif text-4xl font-semibold text-primary mb-2 self-start w-full">
              It's a date! 💌
            </h1>
            <p className="font-sans text-foreground text-base mb-1 w-full self-start">
              glad you didn't say no. be ready by {timeLabel}, i'm coming to get you 🚗 (if you want)
            </p>
            <p className="font-sans text-xs italic text-muted-foreground mb-6 w-full self-start">
              p.s. normal people text. i made a website for you. no big deal.
            </p>

            <div className="bg-white w-full rounded-3xl p-6 shadow-sm border border-border mb-8 flex flex-col gap-4">
              <div>
                <p className="text-xs font-bold text-muted-foreground tracking-wider mb-1">WHEN</p>
                <p className="font-serif text-xl text-primary">{dateLabel}</p>
                <p className="font-sans text-foreground">at {timeLabel}</p>
              </div>
              {selectedActivities.length > 0 && (
                <>
                  <div className="h-px w-full bg-border" />
                  <div>
                    <p className="text-xs font-bold text-muted-foreground tracking-wider mb-1">VIBE</p>
                    <p className="font-serif text-xl text-primary">
                      {selectedActivities.map((id) => {
                        const a = ACTIVITIES.find((x) => x.id === id);
                        return `${a?.label} ${a?.emoji}`;
                      }).join(' · ')}
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              data-testid="button-copy-plan"
              onClick={handleCopyPlan}
              className="bg-primary text-primary-foreground font-serif text-xl font-medium px-8 py-4 w-full rounded-full shadow-lg active:scale-95 transition-transform mb-6 flex items-center justify-center gap-2"
            >
              <span>📋</span> Copy plan &amp; text me
            </button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
