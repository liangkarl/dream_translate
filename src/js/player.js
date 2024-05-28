'use strict'

/**
 * Dream Translate
 * https://github.com/ryanker/dream_translate
 * @Author Ryan <dream39999@gmail.com>
 * @license MIT License
 */

window.playerTips = `<div class="learn_points">
    <div class="title"><b>練習要點</b></div>
    <div class="case">
        1、帶上耳機聽發音，更有助聽清聲音中的細節。<br>
        2、練句子，把生詞融入句子中。<br>
        3、先理解句子含義。如有生詞時，應先根據經驗猜，然後才查詞典確認猜的對不對。首選查英英詞典，推薦朗文或格林斯之類的詞典，把英語當工具使用，用英語思維去學習生詞。如果還沒達到這個能力，才考慮查中英詞典。當理解含義後，忘掉所有文字，不管中文還是英文，理解含義為最終目的。<br>
        4、認真聽句子發音，並模仿發音。模仿發音時，需要忘掉所有文字，腦海裡應浮現出句子運用的場景，把自己置身在場景中，投入感情和動用感官（視覺，聽覺，嗅覺，味覺，觸覺）去模仿。<br>
        5、認真聽自己的發音和原音的差異。<br>
        6、重複第 4-5 步，自我修正發音。直到你感覺語速能跟上，發音接近，並且很流利為止。「練習次數多多益善」
    </div>
</div>

<div class="learn_points">
    <div class="title"><b>語速問題</b></div>
    <div class="case">
        如果感覺語速跟不上，這證明缺乏鍛鍊，不要想著去降低播放速度，而需要鼓勵自己，鍛鍊你的耳朵和嘴巴。開始練習發音吧，當你重複練習 N 次後，你會感覺語速變慢了。相信自己，你可以的！
    </div>
</div>

<div class="learn_points">
    <div class="title"><b>語言運用</b></div>
    <div class="case">
        語言是技能，最重要的是實戰運用。所以句子練熟之後呢？就需要去使用這些句子，如果你有個友好耐心的老外朋友當陪練那當然最好，沒有也不用特別在意，在學習外語過程中，用外語跟自己說話，要比跟別人交流更重要。
    </div>
</div>

<div class="learn_points">
    <div class="title"><b>學習方法</b></div>
    <div class="case">
        如果你對「正確學習英語的方法」感興趣，請閱讀《<a href="https://mengxiang.net/post/english.html" target="_blank">英語學習秘籍</a>》。
    </div>
</div>`

// 播放
function playerListen(id, options) {
    if (!window._playerListen) window._playerListen = []
    let p = window._playerListen
    if (p[id]) {
        p[id].destroy()
    }

    // 創建元素
    let did = document.getElementById(id)
    let wid = id + '_waveform'
    did.innerHTML = `<div class="dmx_player">
    <div class="dmx_p_top">
        <div class="dmx_p_title">Listen</div>
        <div class="dmx_p_time"><span class="dmx_p_current"></span><span class="dmx_p_duration"></span></div>
    </div>
    <div class="dmx_surfer" id="${wid}"></div>
    <div class="dmx_controls"><button type="button">Play</button></div>
</div>`

    // 初始參數
    let o = Object.assign({
        url: '',
        onReady: null,
        onPlay: null,
        onFinish: null,
    }, options)

    // 基本元素
    let p_current = did.querySelector('.dmx_p_current')
    let p_duration = did.querySelector('.dmx_p_duration')
    let p_controls = did.querySelector('.dmx_controls')

    // 創建播放器
    let wsId = document.getElementById(wid)
    let height = wsId.clientHeight
    let ws, maxDuration
    ws = WaveSurfer.create({
        container: wsId,
        height: height,
        barWidth: 3,
        barHeight: 2,
        backend: 'WebAudio',
        backgroundColor: '#66CCCC', // 背景色
        waveColor: '#CCFF66', // 波紋色
        progressColor: '#FF9900', // 填充色(播放後)
        cursorColor: '#666633', // 指針色
        hideScrollbar: true,
    })
    o.url && ws.load(o.url)
    ws.hideControls = function () {
        p_controls.style.display = 'none'
    }
    ws.showControls = function () {
        p_controls.style.display = 'flex'
    }
    ws.on('ready', function () {
        maxDuration = ws.getDuration()
        if (maxDuration > 0) {
            p_duration.innerText = ' / ' + humanTime(maxDuration)
            p_current.innerText = '00:00:000'
        }
        typeof o.onReady === 'function' && o.onReady(maxDuration)
    })
    ws.on('loading', function (percents) {
        p_controls.style.display = percents === 100 ? 'flex' : 'none'
    })
    ws.on('audioprocess', function (duration) {
        p_current.innerText = humanTime(duration)
    })
    ws.on('play', function () {
        ws.hideControls()
        typeof o.onPlay === 'function' && o.onPlay.call(ws)
    })
    ws.on('finish', function () {
        p_current.innerText = humanTime(maxDuration)
        typeof o.onFinish === 'function' ? o.onFinish.call(ws) : ws.showControls()
    })
    p_controls.addEventListener('click', ws.playPause.bind(ws)) // 綁定事件
    window._playerListen[id] = ws
    return ws
}

// 錄音
function playerRecord(id, options) {
    if (!navigator.mediaDevices) return
    if (!window._playerRecord) window._playerRecord = []
    let p = window._playerRecord
    if (p[id]) {
        if (p[id].ws) p[id].ws.destroy()
        if (p[id].recorder) p[id].recorder.destroy()
    }

    // 創建元素
    let did = document.getElementById(id)
    let wid = id + '_waveform'
    did.innerHTML = `<div class="dmx_player">
    <div class="dmx_p_top">
        <div class="dmx_p_title">Record</div>
        <div class="dmx_p_time"><span class="dmx_p_current"></span><span class="dmx_p_duration"></span></div>
    </div>
    <div class="dmx_surfer" id="${wid}"></div>
    <div class="dmx_controls">
        <div class="dmx_circle dmx_reverse"><i class="dmx-icon dmx-icon-voice"></i></div>
        <button type="button" style="display:none">Record</button>
    </div>
</div>`

    // 初始參數
    let o = Object.assign({
        showStartBut: false,
        maxDuration: 5 * 1000,
        mp3Enable: true, // safari 瀏覽器才啟用
        onStart: null,
        onStop: null,
    }, options)

    // 元素
    let p_current = did.querySelector('.dmx_p_current')
    let p_duration = did.querySelector('.dmx_p_duration')
    let p_circle = did.querySelector('.dmx_circle')
    let p_start = did.querySelector('.dmx_controls button')
    let wsId = document.getElementById(wid)
    let height = wsId.clientHeight

    // 初始對象
    let obj = {
        duration: 0,
        recordStartTime: 0, // 開始錄製時間
        recorder: null,
        microphone: null,
        ws: null,
        active: false,
        ButEl: {},
        blob: null,
    }

    // 錄音中按鈕效果
    obj.ButEl.start = () => addClass(p_circle, 'dmx_on')

    // 錄音停止按鈕效果
    obj.ButEl.stop = () => rmClass(p_circle, 'dmx_on')

    // 綁定開始錄音事件
    p_start.addEventListener('click', function () {
        !obj.active && obj.start()
    })

    // 綁定停止錄音事件
    p_circle.addEventListener('click', function () {
        if (!obj.active) return

        // 限制最短錄音時長
        let minTime = 500
        if (!obj.recordStartTime || ((new Date() * 1) - obj.recordStartTime < minTime)) return

        obj.stop()
    })

    obj.showStartBut = function () {
        p_start.style.display = 'flex'
        p_circle.style.display = 'none'
    }
    obj.hideStartBut = function () {
        p_start.style.display = 'none'
        p_circle.style.display = 'flex'
    }

    // 初始按鈕顯示
    o.showStartBut ? obj.showStartBut() : obj.hideStartBut()

    // 定時器
    let t, tEnd
    let timeOutStart = function () {
        obj.recordStartTime = new Date() * 1 // 開始錄製時間
        tEnd = (new Date() * 1) + Number(o.maxDuration)
        t = setInterval(function () {
            let remain = tEnd - (new Date() * 1)
            if (remain > 0) {
                p_current.innerText = humanTime((o.maxDuration - remain) / 1000)
            } else {
                obj.stop()
                clearInterval(t)
                p_current.innerText = humanTime(o.maxDuration / 1000)
            }
        }, 30)
    }
    let timeOutStop = function () {
        if (tEnd < (new Date() * 1)) return
        let remain = tEnd - (new Date() * 1)
        if (remain > 0) {
            p_current.innerText = humanTime((o.maxDuration - remain) / 1000)
            clearInterval(t)
        }
    }

    // 設置最大錄音時長
    obj.setMaxDuration = function (maxDuration) {
        o.maxDuration = Number(maxDuration)
    }

    // 捕獲麥克風
    obj.captureMicrophone = function (callback) {
        navigator.mediaDevices.getUserMedia({audio: true}).then(function (stream) {
            obj.microphone = stream
            callback(obj.microphone)
        })
    }

    // 停止麥克風
    obj.stopMicrophone = function () {
        if (!obj.microphone) return
        if (obj.microphone.getTracks) {
            // console.log('microphone getTracks stop...');
            obj.microphone.getTracks().forEach(stream => stream.stop())
        } else if (obj.microphone.stop) {
            // console.log('microphone stop...');
            obj.microphone.stop()
        }
        obj.microphone = null
    }

    // 銷毀
    obj.destroy = function () {
        obj.stopMicrophone()
        if (obj.recorder) {
            obj.recorder.destroy()
            obj.recorder = null
        }
        if (obj.ws) {
            obj.ws.destroy()
            obj.ws = null
        }
    }

    // 開始錄製
    obj.start = function () {
        if (obj.active) return
        obj.active = true
        obj.recordStartTime = 0

        // 切換按鈕顯示
        if (o.showStartBut) obj.hideStartBut()

        // 開始錄音回調
        typeof o.onStart === 'function' && o.onStart.call(obj)

        // 初始時間
        p_duration.innerText = ' / ' + humanTime(o.maxDuration / 1000)
        p_current.innerText = '00:00:000'

        if (obj.recorder) obj.recorder.destroy()
        if (obj.ws === null) {
            obj.ws = WaveSurfer.create({
                container: wsId,
                height: height,
                barWidth: 3,
                barHeight: 2,
                cursorColor: '#CED5E2', // 指針色
                hideScrollbar: true,
                interact: false,
                plugins: [WaveSurfer.microphone.create()]
            })
            obj.ws.microphone.on('deviceReady', function (stream) {
                obj.microphone = stream
                setTimeout(() => {
                    let options = isFirefox ? {disableLogs: true} : {type: 'audio', disableLogs: true}
                    obj.recorder = window.RecordRTC(stream, options)
                    obj.recorder.startRecording()

                    timeOutStart() // 定時器
                    obj.ButEl.start() // 錄音中
                }, 300)
            })
            obj.ws.microphone.on('deviceError', function (code) {
                console.warn('Device error: ' + code)
            })
            obj.ws.microphone.start()
        } else {
            !obj.ws.microphone.active && obj.ws.microphone.start()
        }
    }

    // 停止錄音
    obj.stop = function () {
        if (!obj.active) return
        obj.active = false

        timeOutStop() // 停止定時器
        obj.ButEl.stop() // 停止錄音

        // 停止錄音器波紋
        obj.ws.microphone.active && obj.ws.microphone.stop()

        // 停止錄音
        obj.recorder.stopRecording(function () {
            // obj.url = this.toURL();
            obj.blob = this.getBlob()
            typeof o.onStop === 'function' && o.onStop.call(obj) // 停止錄音回調
        })
    }
    window._playerRecord[id] = obj
    return obj
}

// 對比
function playerCompare(id, options) {
    if (!window._playerCompare) window._playerCompare = []
    let p = window._playerCompare
    if (p[id]) {
        p[id].destroy()
    }

    let did = document.getElementById(id)
    let wid = id + '_waveform'
    did.innerHTML = `<div class="dmx_player">
    <div class="dmx_p_top">
        <div class="dmx_p_title">Compare</div>
        <div class="dmx_p_time"><span class="dmx_p_current"></span><span class="dmx_p_duration"></span></div>
    </div>
    <div class="dmx_surfer" id="${wid}"></div>
    <div class="dmx_controls"><div class="dmx_circle"><i class="dmx-icon dmx-icon-headset-c"></i></div></div>
</div>`

    // 初始參數
    let o = Object.assign({
        url: '',
        autoPlay: true,
    }, options)

    // 初始化
    let p_current = did.querySelector('.dmx_p_current')
    let p_duration = did.querySelector('.dmx_p_duration')
    let but = did.querySelector('.dmx_circle')

    // 創建播放器
    let wsId = document.getElementById(wid)
    let height = wsId.clientHeight
    let ws = WaveSurfer.create({
        container: wsId,
        height: height,
        barWidth: 3,
        barHeight: 2,
        waveColor: '#FFFF66', // 波紋色
        progressColor: '#FFCC99', // 填充色(播放後)
        cursorColor: '#333', // 指針色
        hideScrollbar: true,
        interact: false,
    })
    o.url && ws.load(o.url)
    let maxDuration, isClickPlay
    ws.on('ready', function () {
        maxDuration = ws.getDuration()
        if (maxDuration > 0) {
            p_duration.innerText = ' / ' + humanTime(maxDuration)
            p_current.innerText = '00:00:000'
        }
        ws.setBackgroundColor('#66b1ff')

        // 自動播放
        if (o.autoPlay) {
            isClickPlay = true
            ws.play()
        }
    })
    ws.on('audioprocess', function (duration) {
        p_current.innerText = humanTime(duration)
    })
    ws.on('play', function () {
        addClass(but, 'dmx_on')
    })
    ws.on('finish', function () {
        isClickPlay = false
        p_current.innerText = humanTime(maxDuration)
        ws.setBackgroundColor('')
        ws.empty()
        rmClass(but, 'dmx_on')
    })
    window._playerCompare[id] = ws

    // 解決 Safari 瀏覽器自動播放音訊失敗問題
    // but.addEventListener('click', () => {
    //     isClickPlay && ws.play()
    // })
    return ws
}

function humanTime(s, isSecond) {
    if (s <= 0) return isSecond ? '00:00:00' : '00:00:000'
    let hs = Math.floor(s / 3600)
    let ms = hs > 0 ? Math.floor((s - hs * 3600) / 60) : Math.floor(s / 60)
    if (isSecond) {
        return zero(hs) + ':' + zero(ms) + ':' + zero(Math.floor(s % 60))
    } else {
        let se = (s % 60).toFixed(3).replace('.', ':')
        if (hs > 0) {
            return zero(hs) + ':' + zero(ms) + ':' + zero(se, 6)
        } else {
            return zero(ms) + ':' + zero(se, 6)
        }
    }
}
