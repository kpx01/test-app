import React, { useState } from 'react';
import './App.css';

// --- 設定定数 ---
const INITIAL_STATS = {
  hp: 18,
  str: 6,
  mag: 0,
  skl: 8,
  spd: 8,
  lck: 7,
  def: 7,
  res: 0
};

const GROWTH_RATES = {
  hp: 80,
  str: 50,
  mag: 5,
  skl: 40,
  spd: 50,
  lck: 70,
  def: 20,
  res: 5
};

const MAX_LEVEL = 20;

/**
 * 能力値の行コンポーネント
 */
const StatRow = ({ name, value, expected, growth, isIncreased, animatingStats, onGrowthChange }) => {
  const statName = name.toUpperCase();
  const currentAnims = animatingStats.filter(a => a.stat === statName);

  const getStatColor = () => {
    if (isIncreased) return '#4ffb4f';
    if (value > expected) return '#61dafb';
    if (value < expected) return '#ff6b6b';
    return 'white';
  };

  return (
    <tr>
      <td>{statName}</td>
      <td style={{
        textAlign: 'left',
        fontWeight: 'bold',
        color: getStatColor(),
        textShadow: isIncreased ? '0 0 10px #4ffb4f, 0 0 20px #4ffb4f' : 'none',
        transition: 'all 0.3s ease-in-out',
        position: 'relative',
      }}>
        {value}
        {currentAnims.map(anim => (
          <span key={anim.id} className="plus-one-animation" style={{ right: '5px' }}>
            +{anim.value}
          </span>
        ))}
      </td>
      <td style={{ textAlign: 'left', color: '#888', fontSize: '0.9em' }}>{expected.toFixed(2)}</td>
      <td style={{ textAlign: 'left', paddingLeft: '10px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.8em', color: '#aaa' }}>{growth}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={growth}
            onChange={(e) => onGrowthChange(name, e.target.value)}
            style={{ width: '100%', height: '12px', cursor: 'pointer', accentColor: '#61dafb', margin: 0 }}
          />
        </div>
      </td>
    </tr>
  );
};

function App() {
  // ユニットの初期データ
  const [unit, setUnit] = useState({
    name: "マルス",
    className: "ロード",
    isPromoted: false,
    level: 1,
    stats: { ...INITIAL_STATS },
    growthRates: { ...GROWTH_RATES }
  });

  // レベルアップの履歴保存用
  const [logs, setLogs] = useState([]);
  // 上昇したステータスを一時的に強調するための状態
  const [recentIncreases, setRecentIncreases] = useState([]);
  // 現在アニメーション中のステータス項目
  const [animatingStats, setAnimatingStats] = useState([]);
  // アニメーション中（連打防止）の状態
  const [isLeveling, setIsLeveling] = useState(false);
  // 期待値計算用のオフセット（クラスチェンジ時のレベルリセット対応）
  const [levelsBeforePromotion, setLevelsBeforePromotion] = useState(0);
  const [promotionBonus, setPromotionBonus] = useState({
    hp: 0, str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0
  });

  // レベルアップ処理
  const handleLevelUp = (numLevels = 1) => {
    if (isLeveling) return;
    if (unit.level + numLevels > MAX_LEVEL) {
      alert(`最大レベル(${MAX_LEVEL})に達するため、${numLevels}レベルアップできません！`);
      return;
    }

    setIsLeveling(true);

    let calcLevel = unit.level;
    const tempLogs = [];
    const tempStatIncreasesMap = {}; // 各ステータスの合計上昇量を記録

    for (let i = 0; i < numLevels; i++) {
      calcLevel++;
      const increasedStatsForThisLevel = [];
      Object.keys(unit.stats).forEach((statKey) => {
        const chance = Math.random() * 100;
        if (chance < unit.growthRates[statKey]) {
          increasedStatsForThisLevel.push(statKey.toUpperCase());
          tempStatIncreasesMap[statKey] = (tempStatIncreasesMap[statKey] || 0) + 1; // 合計上昇量を記録
        }
      });
      const logMessage = increasedStatsForThisLevel.length > 0
        ? `Level ${calcLevel}: ${increasedStatsForThisLevel.join(", ")} が上がった！`
        : `Level ${calcLevel}: ステータスは上がらなかった…`;
      tempLogs.push(logMessage);
    }

    // レベルとログのみ先に更新（能力値は演出時に更新）
    setUnit((prev) => ({
      ...prev,
      level: calcLevel
    }));
    setLogs(prev => [...tempLogs.reverse(), ...prev]); // 新しいログを上に追加 (逆順にしてから追加)

    // アニメーションを順番にトリガー (合計上昇量で)
    let animationDelay = 0;
    setRecentIncreases([]); 
    setAnimatingStats([]);
    
    // ステータスの定義順（HP, STR...）に従ってアニメーションを予約
    Object.keys(unit.stats).forEach((statKey) => {
      const totalIncrease = tempStatIncreasesMap[statKey];
      if (!totalIncrease || totalIncrease <= 0) return;

      setTimeout(() => {
          playStatUpSound();
          const statUpper = statKey.toUpperCase();
          
          // 音に合わせて数値を加算し、ハイライトを表示
          setUnit(prev => ({ ...prev, stats: { ...prev.stats, [statKey]: prev.stats[statKey] + totalIncrease } }));
          setRecentIncreases(prev => [...prev, statUpper]); // このステータスをハイライト
          
          const animationId = `${statUpper}-${Date.now()}-${Math.random()}`;
          setAnimatingStats(prev => [...prev, { stat: statUpper, value: totalIncrease, id: animationId }]);

          // アニメーション終了後に個々のアニメーションとハイライトをクリア
          setTimeout(() => {
            setAnimatingStats(prev => prev.filter(anim => anim.id !== animationId));
            setRecentIncreases(prev => prev.filter(s => s !== statUpper));
          }, 800); // CSSアニメーション時間と合わせる
      }, animationDelay);
      animationDelay += 400; // 各ステータスアニメーションの開始間隔
    });

    // 全ての演出が終了した後にロック解除
    setTimeout(() => {
      setIsLeveling(false);
    }, animationDelay + 900);
  };

  // クラスチェンジ処理
  const handleClassChange = () => {
    if (isLeveling) return; // アニメーション中はクラスチェンジも禁止
    setIsLeveling(true);

    // クラスチェンジボーナス（底上げ値）
    const bonuses = { hp: 4, str: 2, mag: 0, skl: 2, spd: 2, lck: 0, def: 2, res: 2 };

    // 期待値計算用のデータを更新（Lv20でチェンジしたなら19レベル分を保持）
    setLevelsBeforePromotion(unit.level - 1);
    setPromotionBonus(bonuses);

    // クラス名とレベルを先に更新
    setUnit(prev => ({ ...prev, level: 1, className: "スターロード", isPromoted: true }));
    setLogs(prev => [`*** クラスチェンジ！ ${unit.name}はスターロードになった！ ***`, ...prev]);

    setRecentIncreases([]);
    setAnimatingStats([]);

    let delayCount = 0;
    // ステータスの定義順（HP, STR...）に従ってアニメーションを予約
    Object.keys(unit.stats).forEach((statKey) => {
      const totalIncrease = bonuses[statKey];
      if (!totalIncrease || totalIncrease <= 0) return;

      setTimeout(() => {
        playStatUpSound();
        const statUpper = statKey.toUpperCase();
        const animId = `${statUpper}-${Date.now()}-${Math.random()}`;

        setUnit(prev => ({ ...prev, stats: { ...prev.stats, [statKey]: prev.stats[statKey] + totalIncrease } }));
        setRecentIncreases(prev => [...prev, statUpper]);
        setAnimatingStats(prev => [...prev, { stat: statUpper, value: totalIncrease, id: animId }]);

        setTimeout(() => {
          setAnimatingStats(prev => prev.filter(anim => anim.id !== animId));
          setRecentIncreases(prev => prev.filter(s => s !== statUpper));
        }, 800);
      }, delayCount * 400);
      delayCount++;
    });

    setTimeout(() => setIsLeveling(false), delayCount * 400 + 900);
  };

  // 個別のステータス上昇音（ピン！）を生成
  const playStatUpSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // 「ピン！」という短い高音を再現するためにトライアングル波を使用
      oscillator.type = 'triangle'; 
      oscillator.frequency.setValueAtTime(1320, audioContext.currentTime); // 高音 (E6)
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);

      // 素早いアタックと減衰（指数関数的な減衰で自然な響きに）
      gainNode.gain.linearRampToValueAtTime(0.15, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);

      // 終了後にコンテキストを破棄してリソースを解放
      oscillator.onended = () => audioContext.close();
    } catch (e) {
      console.error("Failed to play stat up sound:", e);
    }
  };

  // シミュレーションのリセット処理
  const resetSimulation = (newGrowthRates = GROWTH_RATES) => {
    setUnit({
      name: "マルス",
      className: "ロード",
      isPromoted: false,
      level: 1,
      stats: { ...INITIAL_STATS },
      growthRates: { ...newGrowthRates }
    });
    setLogs([]);
    setRecentIncreases([]);
    setAnimatingStats([]);
    setIsLeveling(false);
    setLevelsBeforePromotion(0);
    setPromotionBonus({ hp: 0, str: 0, mag: 0, skl: 0, spd: 0, lck: 0, def: 0, res: 0 });
  };

  const handleGrowthRateChange = (stat, value) => {
    const val = parseInt(value, 10);
    setUnit(prev => ({
      ...prev,
      growthRates: { ...prev.growthRates, [stat]: val }
    }));
  };

  // ステータスの合計値(suuti)の計算
  const totalStats = Object.values(unit.stats).reduce((acc, val) => acc + val, 0);

  // 成長率の合計値と期待値の計算
  const totalGrowthRate = Object.values(unit.growthRates).reduce((acc, val) => acc + val, 0);
  const expectedStatIncreasePerLevel = Object.values(unit.growthRates).reduce((acc, val) => acc + (val / 100), 0);

  // 現在のレベルにおける全ステータス合計の期待値
  const totalPromoBonus = Object.values(promotionBonus).reduce((acc, val) => acc + val, 0);
  const initialTotalStats = Object.values(INITIAL_STATS).reduce((acc, val) => acc + val, 0);
  const totalExpected = initialTotalStats + (levelsBeforePromotion + unit.level - 1) * expectedStatIncreasePerLevel + totalPromoBonus;

  return (
    <div className="App">
      <header className="App-header">
        <h1 style={{ margin: '10px 0' }}>FE Level Up Simulator</h1>

        <div style={{ display: 'flex', flexDirection: 'row', gap: '15px', alignItems: 'stretch', justifyContent: 'center', padding: '5px', flexWrap: 'wrap', width: '100%', boxSizing: 'border-box' }}>
          
          <div style={{ backgroundColor: '#282c34', padding: '15px', borderRadius: '10px', border: '2px solid white', width: '100%', maxWidth: '500px', height: '600px', overflowY: 'auto', boxSizing: 'border-box' }}>
            <h2 style={{ marginTop: '0', marginBottom: '5px' }}>{unit.name} <span style={{ fontSize: '0.6em', color: '#61dafb' }}>[{unit.className}]</span> (Lv. {unit.level})</h2>
            
            <table style={{ margin: '5px 0', textAlign: 'left', width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ borderBottom: '1px solid #555' }}>能力</th>
                  <th style={{ borderBottom: '1px solid #555', textAlign: 'left' }}>値</th>
                  <th style={{ borderBottom: '1px solid #555', textAlign: 'left' }}>期待値</th>
                  <th style={{ borderBottom: '1px solid #555', textAlign: 'left' }}>成長率</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(unit.stats).map((statKey) => {
                  const expectedValue = INITIAL_STATS[statKey] + (levelsBeforePromotion + unit.level - 1) * (unit.growthRates[statKey] / 100) + promotionBonus[statKey];
                  return (
                    <StatRow
                      key={statKey}
                      name={statKey}
                      value={unit.stats[statKey]}
                      expected={expectedValue}
                      growth={unit.growthRates[statKey]}
                      isIncreased={recentIncreases.includes(statKey.toUpperCase())}
                      animatingStats={animatingStats}
                      onGrowthChange={handleGrowthRateChange}
                    />
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid #555' }}>
                  <td style={{ paddingTop: '10px' }}>TOTAL</td>
                  <td style={{ 
                    textAlign: 'left', 
                    fontWeight: 'bold', 
                    paddingTop: '10px',
                    color: totalStats >= totalExpected ? (totalStats > totalExpected ? '#61dafb' : 'white') : '#ff6b6b'
                  }}>{totalStats}</td>
                  <td style={{ textAlign: 'left', color: '#888', paddingTop: '10px' }}>{totalExpected.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>

            <div style={{ fontSize: '0.9em', color: '#aaa', textAlign: 'center', marginTop: '5px' }}>
              成長率合計: {totalGrowthRate}%
            </div>

            <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {unit.level === MAX_LEVEL && !unit.isPromoted ? (
                <button 
                  onClick={handleClassChange}
                  disabled={isLeveling}
                  style={{ padding: '10px 20px', fontSize: '16px', cursor: isLeveling ? 'not-allowed' : 'pointer', borderRadius: '5px', border: 'none', backgroundColor: '#fbc531', color: '#282c34', fontWeight: 'bold', flex: '1 1 auto' }}>
                  クラスチェンジ！
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => handleLevelUp(1)} 
                    disabled={isLeveling || unit.level >= MAX_LEVEL}
                    style={{ padding: '10px 20px', fontSize: '16px', cursor: (isLeveling || unit.level >= MAX_LEVEL) ? 'not-allowed' : 'pointer', borderRadius: '5px', border: 'none', backgroundColor: (isLeveling || unit.level >= MAX_LEVEL) ? '#444' : '#61dafb', color: '#282c34', fontWeight: 'bold', flex: '1 1 auto' }}>
                    {isLeveling ? '上昇中...' : 'レベルアップ！'}
                  </button>
                  <button 
                    onClick={() => handleLevelUp(5)} 
                    disabled={isLeveling || unit.level + 5 > MAX_LEVEL}
                    style={{ padding: '10px 20px', fontSize: '16px', cursor: (isLeveling || unit.level + 5 > MAX_LEVEL) ? 'not-allowed' : 'pointer', borderRadius: '5px', border: 'none', backgroundColor: (isLeveling || unit.level + 5 > MAX_LEVEL) ? '#444' : '#61dafb', color: '#282c34', fontWeight: 'bold', flex: '1 1 auto' }}>
                    5レベルアップ！
                  </button>
                </>
              )}
              <button onClick={() => resetSimulation(unit.growthRates)} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#666', color: 'white', borderRadius: '5px', border: 'none', flex: '1 1 auto' }}>リセット</button>
            </div>
          </div>

          <div style={{ fontSize: '0.9em', width: '100%', maxWidth: '350px', height: '600px', textAlign: 'left', borderLeft: '2px solid #555', paddingLeft: '15px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <h3 style={{ marginTop: 0, color: '#61dafb' }}>Growth History</h3>
            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
              {logs.length === 0 && <p style={{ color: '#888' }}>レベルアップ履歴がここに表示されます</p>}
              {logs.map((log, index) => (
                <p key={index} style={{ margin: '8px 0', paddingBottom: '8px', borderBottom: '1px solid #333' }}>{log}</p>
              ))}
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}

export default App;
