# DockVoice: demo video script (casual version)

About 4 minutes. Talk like you're showing a friend something cool you built, not presenting at a board
meeting. Relaxed, a bit of fun, but every line says clearly what the product does.

Don't memorize it. Read it a few times, then say it your way.

---

## Before you record (2 minutes of prep)

- [ ] Open the **live Vercel site** (not localhost) and click **Reset demo**
- [ ] Open the deck in another tab (`docs/pitch/deck.html#1`); arrow keys change slides
- [ ] Close other tabs, turn on Do Not Disturb
- [ ] Record with **Clipchamp** (built into Windows) or **OBS**, and capture **system audio** so the
      agent's voice is in the video
- [ ] Use speakers, not headphones, for the demo (the app's echo cancellation handles it)
- [ ] Do one practice run, then **Reset demo** before the real take

---

## 1 · Hook (0:00–0:20)

**On screen:** the landing page with the glowing orb.

> "Hey! Quick question: have you ever tried typing on a computer while holding a box?
> Yeah, me neither. And that's basically what we ask warehouse workers to do every day.
>
> So I built **DockVoice**. You just *talk*, and it does the paperwork for you."

---

## 2 · The problem (0:20–0:50)

**On screen:** deck slide 2 (the problem).

> "Here's the thing. When a truck shows up at a warehouse, someone has to count everything that came off it.
> Their hands are full, so they scribble on paper and type it in later. From memory.
> So counts go wrong, damaged stuff doesn't get reported, and nobody tells the supplier something was
> missing. The company just… pays for stuff it never got.
>
> And real people don't talk like robots. They say things like: *'eighty controllers, sorry, eight zero,
> oh and three are cracked.'* Most systems choke on that. DockVoice doesn't."

---

## 3 · Live demo (0:50–2:40): the fun part

**On screen:** the Receiving Cockpit.

> "Alright, let's try it for real. A delivery from ABC Electronics just arrived. I hit **Start receiving**…"

**Click Start receiving.** Let the agent say hi. Then talk to it:

| You say | What to point out (one short line, or just let it play) |
|---|---|
| "Receiving purchase order 4582 from ABC Electronics." | "It found the order. Three items." |
| "We got eighty controllers, actually sorry, eight zero, and forty-five sensors. The power modules are eighty… no wait, eighteen." | "Watch this: I messed up the number, and it just fixes it. No double counting." |
| "Oh, and three of the sensors are cracked." | "Boom, damage recorded. Those go to quarantine, not onto the shelf." |
| *(it reads everything back)* | "Now it reads it all back to me. It won't save anything until I say yes." (Flip to the **Agent actions** tab for a second) |
| "Yes, post it." | "And… posted! There's the receipt, stamped." |
| "Tell them we need the missing controllers by Friday." | "And it just emailed the supplier. Look, the envelope flies to the outbox." |

> "So in about a minute, just by talking: counted, corrected, damage handled, receipt posted,
> supplier emailed. No keyboard. No clipboard."

**Optional flex:** while it's reading back, cut in with *"Wait, sensors are forty-eight!"* It stops
instantly and updates. Say: *"Yep, you can interrupt it anytime. Just like a real person."*

**Quick tour (15 seconds):** click **End session**, then show the **Vendor Outbox** email.

> "And here's the actual email the supplier gets: what's missing, what's damaged, and a request for
> replacements. All real data in the system."

---

## 4 · How it works (2:40–3:20)

**On screen:** deck slides 6 (architecture) and 7 (tech stack).

> "Now, you might be thinking: an AI touching my inventory? Scary. Totally fair.
> So the AI can't save anything on its own. It fills in a draft, reads it back, and the 'save' button
> literally doesn't exist for it until you say yes. Change your mind after that? It checks with you again.
>
> The voice magic is **AssemblyAI's Voice Agent API**. It listens, understands, talks back, and handles
> interruptions, all through one connection. We even tuned it for noisy warehouses, because forklifts
> are loud.
>
> The rest of the stack: a React and TypeScript front end, a Python FastAPI back end, and Postgres on
> Supabase. All of it runs on free hosting (Vercel, Render and Supabase), and it's tested and strictly typed."

---

## 5 · Business (3:20–3:45)

**On screen:** deck slide 8 (business impact).

> "Who's this for? Warehouses and distributors that still do receiving on paper. There are around forty
> thousand of them in the US alone. It's forty-nine bucks per dock door per month, and in our example it
> pays for itself about twelve times over. Less typing, fewer mistakes, and suppliers who actually get
> held accountable."

---

## 6 · Close (3:45–4:00)

**On screen:** deck slide 9 (close).

> "That's DockVoice. Hands full? Just say it.
> The live demo and the code are linked below. Go give it a try, and thanks for watching!"

*(Optional: "I'm [your name], and I built this for the AssemblyAI Voice Agent Hackathon.")*

---

## Keep it cool: quick tips

- **Smile while you talk.** You can hear it in your voice.
- **Record the demo part first**, while you're fresh. Record the slide parts separately and stitch them
  together in Clipchamp.
- If the agent mishears you, **just correct it out loud**. That's literally the feature. Don't restart.
- Short pauses are fine; trim them later.
- Turn on **auto captions** in Clipchamp, because a lot of people watch muted.
- Final check: **MP4, under 5 minutes.**
