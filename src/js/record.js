'use strict'

/**
 * Dream Translate
 * https://github.com/ryanker/dream_translate
 * @Author Ryan <dream39999@gmail.com>
 * @license MIT License
 */

let bg = B.getBackgroundPage()
let audioSrc = bg.audioSrc || {}
let maxDuration = 5000
let practiceNum = 0
let listen = {}, listen2 = {}, record, compare
document.addEventListener('DOMContentLoaded', function () {
    playerInit()

    // 載入音訊
    setTimeout(() => {
        if (audioSrc.blob) {
            listen.loadBlob(audioSrc.blob)
        } else if (audioSrc.url) {
            bg.getAudioBlob(audioSrc.url).then(b => {
                listen.loadBlob(b)
                audioSrc.blob = b
            })
        }
    }, 200)

    let record_box = $('record_box')
    let favorite_form = $('favorite_form')
    let favorite_but = $('favorite_but')
    let sentence_form = $('sentence_form')
    let back_but = $('back_but')
    let sentenceInp = S('input[name="sentence"]')
    let urlInp = S('input[name="url"]')
    let wordsTex = S('textarea[name="words"]')

    // 練習提示
    record_box.insertAdjacentHTML('beforeend', window.playerTips)

    // 添加收藏
    favorite_but.addEventListener('click', () => {
        addClass(record_box, 'dmx_hide')
        addClass(favorite_form, 'dmx_show')

        if (bg.textTmp) sentenceInp.value = bg.textTmp

        let {url, blob} = audioSrc
        listen2 = playerListen('player_listen2')
        if (blob) listen2.loadBlob(blob)
        if (url) urlInp.value = url
    })

    // 修改連結
    urlInp.addEventListener('blur', () => {
        let url = urlInp.value.trim()
        if (url && url !== audioSrc.url) bg.getAudioBlob(url).then(blob => listen2.loadBlob(blob))
    })

    // 返回
    back_but.addEventListener('click', () => {
        rmClass(record_box, 'dmx_hide')
        rmClass(favorite_form, 'dmx_show')
    })

    // 提交表單
    sentence_form.addEventListener('submit', (e) => {
        e.preventDefault()
        idb('favorite', 1, initFavorite).then(async db => {
            // 如果連結修改過，重新獲取二進位制文件
            let url = urlInp.value.trim()
            if (url && url !== audioSrc.url) await bg.getAudioBlob(url).then(b => audioSrc.blob = b)

            await db.create('sentence', {
                cateId: 0,
                sentence: sentenceInp.value.trim(),
                words: wordsTex.value.trim(),
                remark: '',
                records: 0,
                days: 0,
                url,
                blob: audioSrc.blob,
                practiceDate: '',
                createDate: new Date().toJSON(),
            }).then(() => {
                dal('添加完成', 'success', () => {
                    sentenceInp.value = ''
                    wordsTex.value = ''
                    back_but.click()
                })
            }).catch(e => {
                // console.log(e)
                let err = e.target.error.message
                let msg = '添加失敗'
                if (err && err.includes('uniqueness requirements')) msg = '句子已存在，請勿重複添加'
                dal(msg, 'error')
            })
        })
    })
})

// 重新渲染
window.addEventListener('resize', function (e) {
    _setTimeout('resize', () => {
        if (audioSrc.blob) listen.loadBlob(audioSrc.blob)
    }, 1000)
})

function playerInit() {
    listen = playerListen('player_listen', {
        onReady: function (duration) {
            let times = 2
            if (duration > 10) times *= 2.5 // 時間越長，模仿越難
            maxDuration = Math.ceil(duration * times) * 1000
            record.setMaxDuration(maxDuration)
        },
        onFinish: () => {
            record.start() // 開始錄音
        },
    })

    record = playerRecord('player_record', {
        maxDuration,
        onStop: () => {
            compare.loadBlob(audioSrc.blob)
            compare.once('finish', () => {
                let t = setTimeout(() => listen.showControls(), maxDuration + 1000)  // 顯示播放按鈕
                setTimeout(() => {
                    // compare.load(URL.createObjectURL(record.blob))
                    compare.loadBlob(record.blob)
                    compare.once('finish', () => {
                        clearTimeout(t)
                        listen.showControls() // 顯示播放按鈕
                        $('practice_num').innerText = ++practiceNum // 練習次數
                    })
                }, 100)
            })
        },
    })

    compare = playerCompare('player_compare')
}
