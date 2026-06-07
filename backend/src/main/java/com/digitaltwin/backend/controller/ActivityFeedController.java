package com.digitaltwin.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.*;
import java.util.concurrent.*;

@RestController
@RequestMapping("/api/feed")
public class ActivityFeedController {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final Random RAND = new Random();

    private static final String[] NAMES = {
        "Shadow Monk","Iron Phoenix","Void Sentinel","Storm Architect","Night Strategist",
        "Silent Forger","Ember Mind","Fractal Sage","Iron Weaver","Void Scholar",
        "Storm Pioneer","Phoenix Coder","Sage Sentinel","Night Monk","Ember Architect",
        "Void Pioneer","Iron Sage","Storm Monk","Silent Coder","Fractal Sentinel"
    };

    private static final String[] EVENTS = {
        "%s completed 7-Day Sleep Streak +200 XP",
        "%s joined Deep Work League",
        "%s solved 10 DSA problems today",
        "%s hit a 7-day streak 🔥",
        "%s unlocked Badge: Week Warrior",
        "%s completed Pomodoro session",
        "%s saved ₹3,000 this week",
        "%s finished 90-min Deep Work session",
        "%s reached Seeker tier",
        "%s joined the 5AM Club",
        "%s completed Zero Stress Week",
        "%s logged 10,000 steps today",
        "%s earned 150 XP from Grind Room",
        "%s unlocked All-Rounder badge ⭐",
        "%s maintained 14-day streak",
        "%s completed Budget Warrior challenge",
        "%s hit top 10%% in Career Growth",
    };

    private final ScheduledExecutorService scheduler =
            Executors.newScheduledThreadPool(2, r -> {
                Thread t = new Thread(r, "feed-sse");
                t.setDaemon(true);
                return t;
            });

    @GetMapping(value = "/live", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter liveFeed() {
        SseEmitter emitter = new SseEmitter(300_000L);

        ScheduledFuture<?> future = scheduler.scheduleAtFixedRate(() -> {
            try {
                String name  = NAMES[RAND.nextInt(NAMES.length)];
                String tmpl  = EVENTS[RAND.nextInt(EVENTS.length)];
                String text  = String.format(tmpl, name);
                long   ago   = RAND.nextInt(60); // "X seconds ago"

                Map<String, Object> event = Map.of(
                        "id",      UUID.randomUUID().toString().substring(0, 8),
                        "text",    text,
                        "ago",     ago,
                        "type",    pickType(tmpl)
                );
                emitter.send(SseEmitter.event().name("activity").data(MAPPER.writeValueAsString(event)));
            } catch (Exception e) {
                emitter.completeWithError(e);
            }
        }, 1, 5, TimeUnit.SECONDS);

        Runnable cleanup = () -> future.cancel(true);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> cleanup.run());
        return emitter;
    }

    private String pickType(String tmpl) {
        if (tmpl.contains("XP") || tmpl.contains("xp"))    return "xp";
        if (tmpl.contains("Badge") || tmpl.contains("badge")) return "badge";
        if (tmpl.contains("joined"))                         return "social";
        if (tmpl.contains("streak"))                         return "streak";
        return "activity";
    }
}
