// api/matches.js
const CACHE_TTL_MS = 30 * 1000; // 30 seconds

let memoryCache = {
  data: null,
  timestamp: 0,
};

// Realistic fallback data so the app works immediately before you add an API key
function getFallbackMatches() {
  return [
    {
      id: "ind-vs-aus-live",
      name: "India vs Australia, 3rd T20I",
      series: "Border-Gavaskar T20I Series",
      format: "T20",
      maxOvers: 20,
      status: "live",
      statusText: "India need 38 runs in 22 balls",
      venue: "M. Chinnaswamy Stadium, Bengaluru",
      teams: [
        { name: "India", short: "IND", color: "#38bdf8" },
        { name: "Australia", short: "AUS", color: "#facc15" }
      ],
      innings: [
        { team: "Australia", short: "AUS", runs: 192, wickets: 6, overs: 20.0 },
        { team: "India", short: "IND", runs: 155, wickets: 4, overs: 16.2 }
      ],
      target: 193,
      winner: null,
      scorecard: {
        batting: [
          { name: "Suryakumar Yadav*", runs: 54, balls: 29, fours: 6, sixes: 3, sr: "186.2" },
          { name: "Hardik Pandya*", runs: 22, balls: 13, fours: 2, sixes: 1, sr: "169.2" },
          { name: "Yashasvi Jaiswal", runs: 38, balls: 24, fours: 5, sixes: 1, sr: "158.3" },
          { name: "Shubman Gill", runs: 24, balls: 18, fours: 3, sixes: 0, sr: "133.3" }
        ],
        bowling: [
          { name: "Mitchell Starc*", overs: "3.2", maidens: 0, runs: 31, wickets: 2, econ: "9.3" },
          { name: "Pat Cummins", overs: "3.0", maidens: 0, runs: 28, wickets: 1, econ: "9.3" },
          { name: "Adam Zampa", overs: "4.0", maidens: 0, runs: 34, wickets: 1, econ: "8.5" }
        ]
      }
    },
    {
      id: "ind-vs-eng-odi",
      name: "India vs England, 1st ODI",
      series: "England Tour of India",
      format: "ODI",
      maxOvers: 50,
      status: "live",
      statusText: "England batting — 1st Innings",
      venue: "Narendra Modi Stadium, Ahmedabad",
      teams: [
        { name: "India", short: "IND", color: "#38bdf8" },
        { name: "England", short: "ENG", color: "#ef4444" }
      ],
      innings: [
        { team: "England", short: "ENG", runs: 184, wickets: 3, overs: 31.4 }
      ],
      target: null,
      winner: null,
      scorecard: {
        batting: [
          { name: "Joe Root*", runs: 68, balls: 74, fours: 6, sixes: 0, sr: "91.9" },
          { name: "Jos Buttler*", runs: 31, balls: 26, fours: 3, sixes: 1, sr: "119.2" },
          { name: "Ben Duckett", runs: 49, balls: 45, fours: 7, sixes: 0, sr: "108.9" }
        ],
        bowling: [
          { name: "Jasprit Bumrah*", overs: "6.4", maidens: 1, runs: 27, wickets: 2, econ: "4.0" },
          { name: "Kuldeep Yadav", overs: "7.0", maidens: 0, runs: 39, wickets: 1, econ: "5.6" }
        ]
      }
    },
    {
      id: "mi-vs-csk-finished",
      name: "Mumbai Indians vs Chennai Super Kings",
      series: "Indian Premier League",
      format: "T20",
      maxOvers: 20,
      status: "completed",
      statusText: "Mumbai Indians won by 4 wickets",
      venue: "Wankhede Stadium, Mumbai",
      teams: [
        { name: "Mumbai Indians", short: "MI", color: "#2563eb" },
        { name: "Chennai Super Kings", short: "CSK", color: "#eab308" }
      ],
      innings: [
        { team: "Chennai Super Kings", short: "CSK", runs: 186, wickets: 5, overs: 20.0 },
        { team: "Mumbai Indians", short: "MI", runs: 189, wickets: 6, overs: 19.3 }
      ],
      target: 187,
      winner: "Mumbai Indians",
      scorecard: {
        batting: [
          { name: "Rohit Sharma", runs: 62, balls: 38, fours: 7, sixes: 3, sr: "163.2" },
          { name: "Tilak Varma*", runs: 44, balls: 25, fours: 4, sixes: 2, sr: "176.0" }
        ],
        bowling: [
          { name: "Matheesha Pathirana", overs: "4.0", maidens: 0, runs: 32, wickets: 3, econ: "8.0" },
          { name: "Ravindra Jadeja", overs: "4.0", maidens: 0, runs: 29, wickets: 1, econ: "7.2" }
        ]
      }
    }
  ];
}

function makeShort(name = "TBD") {
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.slice(0, 3).toUpperCase();
  return words.map(w => w[0]).join("").slice(0, 3).toUpperCase();
}

function normalizeCricketData(apiList = []) {
  return apiList.slice(0, 20).map((m) => {
    const t1 = m.teams?.[0] || "Team A";
    const t2 = m.teams?.[1] || "Team B";
    const isT20 = (m.matchType || "").toLowerCase().includes("t20");
    const isODI = (m.matchType || "").toLowerCase().includes("odi");
    const maxOvers = isT20 ? 20 : isODI ? 50 : 90;

    const innings = (m.score || []).map((s) => {
      const teamName = (s.inning || "").replace(/ Inning \d+/i, "").trim() || t1;
      return {
        team: teamName,
        short: makeShort(teamName),
        runs: Number(s.r || 0),
        wickets: Number(s.w || 0),
        overs: Number(s.o || 0)
      };
    });

    let status = "upcoming";
    if (m.matchEnded) status = "completed";
    else if (m.matchStarted) status = "live";

    let winner = null;
    if (status === "completed" && m.status) {
      if (m.status.toLowerCase().includes(t1.toLowerCase())) winner = t1;
      else if (m.status.toLowerCase().includes(t2.toLowerCase())) winner = t2;
    }

    return {
      id: m.id,
      name: m.name || `${t1} vs ${t2}`,
      series: m.series_id || m.matchType?.toUpperCase() || "International",
      format: (m.matchType || "T20").toUpperCase(),
      maxOvers,
      status,
      statusText: m.status || "Match scheduled",
      venue: m.venue || "Venue TBA",
      teams: [
        { name: t1, short: makeShort(t1), color: "#38bdf8" },
        { name: t2, short: makeShort(t2), color: "#f59e0b" }
      ],
      innings,
      target: innings.length >= 2 ? innings[0].runs + 1 : null,
      winner,
      scorecard: { batting: [], bowling: [] }
    };
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=15");

  const now = Date.now();
  const matchId = req.query?.id || null;

  try {
    let matches;
    let source = "cache";

    if (memoryCache.data && now - memoryCache.timestamp < CACHE_TTL_MS) {
      matches = memoryCache.data;
    } else {
      const apiKey = process.env.CRICKET_API_KEY;

      if (apiKey) {
        const apiUrl = `https://api.cricapi.com/v1/currentMatches?apikey=${encodeURIComponent(apiKey)}&offset=0`;
        const response = await fetch(apiUrl);
        const json = await response.json();

        if (json.status === "success" && Array.isArray(json.data) && json.data.length > 0) {
          matches = normalizeCricketData(json.data);
          source = "live_api";
        } else {
          matches = getFallbackMatches();
          source = "fallback";
        }
      } else {
        matches = getFallbackMatches();
        source = "demo";
      }

      memoryCache = { data: matches, timestamp: now };
    }

    if (matchId) {
      const match = matches.find((m) => m.id === matchId);
      if (!match) return res.status(404).json({ error: "Match not found" });
      return res.status(200).json({
        source,
        cachedAt: new Date(memoryCache.timestamp).toISOString(),
        match
      });
    }

    return res.status(200).json({
      source,
      cachedAt: new Date(memoryCache.timestamp).toISOString(),
      matches
    });
  } catch (err) {
    return res.status(200).json({
      source: "fallback_error",
      cachedAt: new Date().toISOString(),
      matches: getFallbackMatches()
    });
  }
};