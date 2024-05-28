'use strict'

/**
 * Dream Translate
 * https://github.com/ryanker/dream_translate
 * @Author Ryan <dream39999@gmail.com>
 * @license MIT License
 */

let db, cateId = 0
let sentenceData = {}
let listen, record, compare
document.addEventListener('DOMContentLoaded', async function () {
    await idb('favorite', 1, initFavorite).then(r => db = r)

    initCate() // 載入分類
    createCate() // 添加分類
    updateCate() // 編輯分類
    deleteCate() // 刪除分類

    selectAll() // 全選/取消全選
    moveSentence() // 批次移動句子
    deleteBatchSentence() // 批次刪除句子

    exportZip() // 導出
    importZip() // 導入
    openSetting() // 設置
})

// 添加分類
function createCate() {
    $('create_cate_but').addEventListener('click', function () {
        ddi({
            title: '新增分類', body: `<div class="dmx_form_item">
            <div class="item_label">分類名稱</div>
                <div class="item_content"><input id="create_cateName" type="text" autocomplete="off" required class="item_input"></div>
            </div>
            <div class="dmx_right">
                <button class="dmx_button" id="create_cate">添加</button>
            </div>`
        })
        $('create_cate').addEventListener('click', () => {
            let cateName = $('create_cateName').value.trim()
            if (!cateName) return dal('請填寫分類名稱', 'error')
            let d = new Date().toJSON()
            db.create('cate', {cateName, updateDate: d, createDate: d}).then(_ => {
                removeDdi()
                initCate()
            }).catch(e => {
                let err = e.target.error.message
                let msg = '添加失敗'
                if (err && err.includes('uniqueness requirements')) msg = '分類已存在，請勿重複添加'
                dal(msg, 'error')
            })
        })
    })
}

// 編輯分類
function updateCate() {
    $('cate_edit').addEventListener('click', function () {
        ddi({
            title: '編輯分類', body: `<div class="dmx_form_item">
            <div class="item_label">分類名稱</div>
                <div class="item_content"><input id="update_cateName" type="text" autocomplete="off" required class="item_input"></div>
            </div>
            <div class="dmx_right">
                <button class="dmx_button" id="update_cate">保存</button>
            </div>`
        })
        let updateEl = $('update_cateName')
        updateEl.value = $('cate_name').innerText
        $('update_cate').addEventListener('click', () => {
            let cateName = updateEl.value.trim()
            if (!cateName) return dal('分類名稱不能為空', 'error')
            db.update('cate', cateId, {cateName}).then(_ => {
                removeDdi()
                initCate()
            }).catch(e => {
                let err = e.target.error.message
                let msg = '修改失敗'
                if (err && err.includes('uniqueness requirements')) msg = '分類名稱不允許重名'
                dal(msg, 'error')
            })
        })
    })
}

// 刪除分類
function deleteCate() {
    $('cate_delete').addEventListener('click', function () {
        dco('刪除分類不可恢復，確認刪除嗎？', () => {
            if (cateId < 1) return dal('系統分類不允許刪除', 'error')
            db.count('sentence', 'cateId', cateId).then(n => {
                if (n > 0) return dal('分類存在數據，請先清空數據', 'error')
                db.delete('cate', cateId).then(_ => initCate(0)).catch(_ => dal('刪除失敗', 'error'))
            })
        })
    })
}

// 批次移動句子
function moveSentence() {
    $('sentence_move').addEventListener('click', function () {
        db.getAll('cate').then(arr => {
            let s = '<option value="-1">選擇分類</option>'
            arr.forEach(v => {
                if (v.cateId === cateId) return // 排除當前分類
                s += `<option value="${v.cateId}">${v.cateName}</option>`
            })

            ddi({
                title: '移動到', body: `<div class="dmx_form_item">
                <div class="item_label">分類</div>
                    <div class="item_content"><select id="move_cateId">${s}</select></div>
                </div>
                <div class="dmx_right">
                    <button class="dmx_button" id="move_cate_but">確認</button>
                </div>`
            })
            $('move_cate_but').addEventListener('click', () => {
                let cateId = Number($('move_cateId').value)
                if (cateId < 0) return dal('請選擇分類', 'error')

                let eList = D('td.tb_checkbox input[type="checkbox"]:checked')
                eList.forEach(el => {
                    db.update('sentence', Number(el.value), {cateId}).catch(_ => dal('移動失敗', 'error'))
                })
                setTimeout(() => {
                    removeDdi()
                    initCate(cateId)
                    selectCancel()
                }, 1000)
            })
        })
    })
}

// 批次刪除句子
function deleteBatchSentence() {
    $('sentence_delete').addEventListener('click', function () {
        let eList = D('td.tb_checkbox input[type="checkbox"]:checked')
        dco(`刪除不可恢復，您確認要刪除這 ${eList.length} 條數據嗎？`, () => {
            eList.forEach(el => {
                db.delete('sentence', Number(el.value)).catch(_ => dal('刪除失敗', 'error'))
            })
            setTimeout(() => {
                initCate()
                selectCancel()
            }, 1000)
        })
    })
}

// 載入分類
function initCate(id) {
    db.getAll('cate').then(arr => {
        let s = ''
        arr.forEach(v => {
            s += `<li data-id="${v.cateId}"><a><i class="dmx-icon dmx-icon-folder"></i>${v.cateName}</a></li>`
        })
        $('cate_box').innerHTML = s

        // 分類篩選
        D('#cate_box li').forEach(el => {
            el.addEventListener('click', () => {
                cateId = Number(el.dataset.id)
                initSentence(cateId)
                D('#cate_box li.active').forEach(e => rmClass(e, 'active'))
                addClass(el, 'active')
            })
        })

        // 初始
        let firstEl = S(`#cate_box li[data-id="${typeof id === 'number' ? id : cateId || 0}"]`)
        if (firstEl) firstEl.click()
    })
}

// 載入句子
function initSentence(cateId) {
    let thLen = D('#sentence_box thead th').length
    let tbodyEl = S('#sentence_box tbody')
    if (!tbodyEl.innerHTML) tbodyEl.innerHTML = `<tr><td class="table_empty" colspan="${thLen}"><div class="dmx-icon dmx-icon-loading"></div></td></tr>`

    db.read('cate', cateId).then(cate => $('cate_name').innerText = cate.cateName)
    db.count('sentence', 'cateId', cateId).then(n => $('sentences').innerText = n)

    let orderBy = localStorage['orderBy']
    let direction = orderBy === 'reverse' ? 'prev' : 'next'
    db.find('sentence', {indexName: 'cateId', query: cateId, direction}).then(arr => {
        if (arr.length < 1) {
            tbodyEl.innerHTML = `<tr><td class="table_empty" colspan="${thLen}">暫無內容</td></tr>`
            return
        }

        if (orderBy === 'random') shuffle(arr) // 隨機

        // console.log(JSON.stringify(arr))
        let s = ''
        arr.forEach((v, k) => {
            s += `<tr>
                <td class="tb_checkbox"><input type="checkbox" value="${v.id}"></td>
                <td class="tb_sentence">${pointSentence(v.sentence, v.words)}</td>
                <td class="tb_records">${v.records}</td>
                <td class="tb_days">${v.days}</td>
                <td class="tb_date" title="${getDate(v.createDate)}">${getDate(v.createDate, true)}</td>
                <td class="tb_operate" data-id="${v.id}" data-key="${k}">
                    <div class="dmx_button" data-action="skill">練習</div>
                    <div class="dmx_button dmx_button_warning" data-action="edit">修改</div>
                    <div class="dmx_button dmx_button_danger" data-action="delete">刪除</div>
                </td>
            </tr>`
        })
        tbodyEl.innerHTML = s
        sentenceData = arr
        selectBind()
        exerciseSentence() // 練習句子
        editSentence()
        deleteSentence()
    })
}

// 練習句子
function exerciseSentence() {
    D('.dmx_button[data-action="skill"]').forEach(el => {
        el.addEventListener('click', () => {
            ddi({
                fullscreen: true,
                title: '',
                body: `<div class="player_box">
                        <div class="tab fx">
                            <u data-type="skill" class="active">朗讀練習</u>
                            <u data-type="record">發音練習</u>
                            <u data-type="listen">聽力練習</u>
                        </div>
                        <div id="skill_box"></div>
                    </div>`,
                onClose: () => {
                    listen.stop()
                    initSentence(cateId)
                }
            })

            // 綁定事件
            let tabEl = D('.player_box u[data-type]')
            let boxEl = $('skill_box')
            tabEl.forEach(e => {
                e.addEventListener('click', () => {
                    // 練習狀態時，不允許切換菜單，防止衝突
                    if (window.isExercising) {
                        dal('練習狀態時，不允許切換菜單', 'error')
                        return
                    }
                    let len = sentenceData.length
                    let key = Number(el.parentNode.dataset.key)
                    let type = e.dataset.type
                    let s = '<div id="player_sentence"></div>'
                    if (type === 'skill') {
                        s += '<div id="player_listen" style="display:none"></div><div id="player_record"></div><div id="player_compare"></div>'
                    } else if (type === 'record') {
                        s += '<div id="player_listen"></div><div id="player_record"></div><div id="player_compare"></div>'
                    } else if (type === 'listen') {
                        s += '<div id="player_listen"></div>'
                    }
                    s += `<div class="divider"><b><span id="practice_num">0</span> 次</b></div></div>`
                    s += `<div class="dmx_center${type === 'listen' ? ' dmx_hide' : ''}"><button class="dmx_button medium" id="next_but">下一句 (<span>${key + 1}</span>/${len})</button></div>`
                    if (type === 'listen') {
                        s += `<div class="dmx_left dmx_form_item">
                            <div class="item_label">播放次數</div>
                            <div class="item_content number"><input id="player_num" type="number" value="2" class="item_input"></div>
                            <div class="ml_1"><div class="dmx_button dmx_button_danger medium" id="stop_but">停止播放</div></div>
                        </div>`
                    }
                    s += window.playerTips
                    boxEl.innerHTML = s
                    rmClassD(tabEl, 'active')
                    addClass(e, 'active')
                    playerInit(key, type)

                    // 下一句
                    $('next_but').addEventListener('click', function () {
                        let nextKey = Number(el.parentNode.dataset.key) + 1
                        let newKey = nextKey >= len ? 0 : nextKey
                        el.parentNode.dataset.key = String(newKey)
                        this.querySelector('span').innerText = String(newKey + 1)
                        $('practice_num').innerText = 0
                        rmClass($('player_sentence'), 'hide')
                        playerInit(newKey, type)
                    })

                    // 停止播放
                    if (type === 'listen') {
                        $('stop_but').addEventListener('click', () => {
                            listen.stop()
                            listen.showControls()
                        })
                    }
                })
            })

            // 初始
            setTimeout(() => {
                let el = S('.player_box u[data-type="skill"]')
                if (el) el.click()
            }, 100)
        })
    })
}

// 載入播放器
function playerInit(key, type) {
    let maxDuration = 5000
    let practiceNum = 0
    let row = sentenceData[key] || {}
    let sentence = row.sentence || ''
    let words = row.words || ''
    let records = row.records || 0
    let days = row.days || 0
    let practiceDate = row.practiceDate || ''

    let senEl = $('player_sentence')
    let nextEl = $('next_but')

    // 顯示句子
    senEl.innerHTML = pointSentence(sentence, words, type === 'record')

    // 練習次數
    let setPracticeNum = function (n, isUpdate) {
        let el = $('practice_num')
        if (el) el.innerText = n

        // 更新 DB
        if (isUpdate) {
            records++
            if (practiceDate) {
                let oldDate = getDate(practiceDate, true).replace(/\D/g, '')
                let nowDate = getDate(null, true).replace(/\D/g, '')
                if (oldDate < nowDate) days++
            } else {
                days++
            }
            practiceDate = new Date().toJSON()
            row.records = records
            row.days = days
            row.practiceDate = practiceDate
            db.update('sentence', row.id, {records, days, practiceDate})
        }
    }

    // 載入完成
    if (type === 'skill') {
        listen = playerListen('player_listen', {
            onReady: function (duration) {
                let times = 2
                if (duration > 10) times *= 2.5 // 時間越長，模仿越難
                maxDuration = Math.ceil(duration * times) * 1000
                record.setMaxDuration(maxDuration)
            }
        })
        listen.loadBlob(row.blob)
        record = playerRecord('player_record', {
            showStartBut: true,
            maxDuration,
            onStart: () => {
                window.isExercising = true // 用來限制練習狀態時，不允許切換菜單
                nextEl.disabled = true
            },
            onStop: () => {
                compare.loadBlob(row.blob)
                compare.once('finish', () => {
                    let t = setTimeout(() => record.showStartBut(), maxDuration + 1000)
                    setTimeout(() => {
                        compare.loadBlob(record.blob)
                        compare.once('finish', () => {
                            clearTimeout(t)
                            record.showStartBut()
                            window.isExercising = false // 解除限制
                            nextEl.disabled = false // 解除禁用
                            setPracticeNum(++practiceNum, true) // 練習次數
                            if (practiceNum === 10) addClass(senEl, 'hide') // 提升難度，隱藏文字
                        })
                    }, 100)
                })
            },
        })
        compare = playerCompare('player_compare')
    } else if (type === 'record') {
        listen = playerListen('player_listen', {
            onReady: function (duration) {
                let times = 2
                if (duration > 10) times *= 2.5 // 時間越長，模仿越難
                maxDuration = Math.ceil(duration * times) * 1000
                record.setMaxDuration(maxDuration)
            },
            onPlay: () => {
                window.isExercising = true // 用來限制練習狀態時，不允許切換菜單
                nextEl.disabled = true
            },
            onFinish: () => record.start(), // 開始錄音
        })
        listen.loadBlob(row.blob)
        record = playerRecord('player_record', {
            maxDuration,
            onStop: () => {
                compare.loadBlob(row.blob)
                compare.once('finish', () => {
                    let t = setTimeout(() => listen.showControls(), maxDuration + 1000) // 顯示開始錄音按鈕
                    setTimeout(() => {
                        compare.loadBlob(record.blob)
                        compare.once('finish', () => {
                            clearTimeout(t)
                            listen.showControls() // 顯示播放按鈕
                            window.isExercising = false // 解除限制
                            nextEl.disabled = false // 解除禁用
                            setPracticeNum(++practiceNum, true) // 練習次數
                            if (practiceNum === 5) senEl.innerHTML = pointSentence(sentence, words) // 降低難度，顯示文字
                            if (practiceNum === 10) addClass(senEl, 'hide') // 提升難度，隱藏文字
                        })
                    }, 100)
                })
            }
        })
        compare = playerCompare('player_compare')
    } else if (type === 'listen') {
        listen = playerListen('player_listen', {
            onFinish: () => {
                listen.play()
                let nEl = $('player_num')
                let n = nEl && nEl.value ? Number(nEl.value) : 2
                setPracticeNum(++practiceNum) // 練習次數
                if (practiceNum > 10) addClass(senEl, 'hide') // 提升難度，隱藏文字
                if (practiceNum >= n) {
                    $('next_but').click()
                    setTimeout(() => listen.play(), 100)
                }
            }
        })
        listen.loadBlob(row.blob)
    }
}

// 解析重點詞彙
function pointSentence(sentence, words, isUnderscore) {
    let s = HTMLEncode(sentence)
    let arr = words.split('\n')
    arr = uniqueArray(arr)
    for (let v of arr) {
        v = HTMLEncode(v.trim())
        if (!v) continue
        v = v.replace(/([.?+*])/g, '\\$1')

        let reg = new RegExp(`^(${v})\\W|\\W(${v})\\W|\\W(${v})$|^(${v})$`, 'g')
        // console.log(reg)
        s = s.replace(reg, (...args) => {
            let str = args[0]
            let word = args.slice(1, -2).join('')
            if (isUnderscore) {
                return str.replace(word, '___')
            } else {
                if (word === 'u') return str
                return str.replace(word, `<u>${word}</u>`)
            }
        })
    }

    return s
}

// 修改句子
function editSentence() {
    D('.dmx_button[data-action="edit"]').forEach(el => {
        el.addEventListener('click', () => {
            ddi({
                title: '修改',
                body: `<div id="sentence_form">
        <div class="dmx_form_item">
            <div class="item_label">句子</div>
            <div class="item_content"><input name="sentence" type="text" autocomplete="off" required class="item_input"></div>
        </div>
        <div class="dmx_form_item">
            <div class="item_label">生詞</div>
            <div class="item_content"><textarea name="words" autocomplete="off" class="item_textarea"></textarea></div>
        </div>
        <div class="dmx_form_item">
            <div class="item_label">備註</div>
            <div class="item_content"><textarea name="remark" autocomplete="off" class="item_textarea"></textarea></div>
        </div>
        <div class="dmx_right">
            <button class="dmx_button" type="submit">確認</button>
        </div>
    </div>`
            })
            let id = Number(el.parentNode.dataset.id)
            let formEl = $('sentence_form')
            let sentenceEl = formEl.querySelector('[name="sentence"]')
            let wordsEl = formEl.querySelector('[name="words"]')
            let remarkEl = formEl.querySelector('[name="remark"]')
            let submitEl = formEl.querySelector('button[type="submit"]')
            db.read('sentence', id).then(row => {
                sentenceEl.value = row.sentence
                wordsEl.value = row.words
                remarkEl.value = row.remark
            })
            submitEl.addEventListener('click', () => {
                let sentence = sentenceEl.value.trim()
                if (!sentence) return dal('句子內容不能為空', 'error')
                db.update('sentence', id, {
                    sentence,
                    words: wordsEl.value,
                    remark: remarkEl.value,
                }).then(_ => {
                    removeDdi()
                    initSentence(cateId)
                }).catch(_ => dal('修改失敗', 'error'))
            })
        })
    })
}

// 刪除句子
function deleteSentence() {
    D('.dmx_button[data-action="delete"]').forEach(el => {
        el.addEventListener('click', () => {
            let id = Number(el.parentNode.dataset.id)
            dco(`刪除不可恢復，您確認要刪除嗎？`, () => {
                db.delete('sentence', id).then(_ => initSentence(cateId)).catch(_ => dal('刪除失敗', 'error'))
            })
        })
    })
}

// 顯示批次操作按鈕
function selectBind() {
    let eList = D('td.tb_checkbox input[type="checkbox"]')
    eList.forEach(el => {
        el.addEventListener('click', () => {
            let len = 0
            eList.forEach(e => e.checked && len++)
            ;(len > 0 ? addClass : rmClass)($('extra_but'), 'dmx_show')
        })
    })
}

// 導出
function exportZip() {
    $('export').addEventListener('click', async function () {
        loading('打包下載...')
        let zip = new JSZip()

        // cate
        await db.find('cate').then(arr => {
            zip.file(`cate.json`, JSON.stringify(arr))
        })

        // sentence
        let sentence = {}
        let typeArr = {}
        await db.find('sentence').then(arr => {
            for (let v of arr) {
                // zip.file(`${v.id}.json`, JSON.stringify(v))
                zip.file(`mp3/${v.id}.mp3`, v.blob)
                typeArr[v.id] = v.blob.type
                delete v.blob
            }
            sentence = arr
        })
        zip.file(`sentence.json`, JSON.stringify(sentence))
        zip.file(`mp3Type.json`, JSON.stringify(typeArr))

        debug('zip generateAsync ...')
        await zip.generateAsync({type: 'blob'}).then(function (blob) {
            downloadZip(blob)
            removeDdi()
        }).catch(err => console.warn('zip generateAsync error:', err))
    })
}

// 下載 ZIP
function downloadZip(blob) {
    let el = document.createElement('a')
    el.href = URL.createObjectURL(blob)
    el.download = `夢想劃詞翻譯-${getDate().replace(/\D/g, '')}.zip`
    el.click()
}

// 導入
function importZip() {
    $('import').addEventListener('click', function () {
        ddi({
            title: '導入', body: `<div class="dmx_form_item">
                <div class="item_label">清空數據</div>
                <div class="item_content"><input type="checkbox" id="import_clear"></div>
            </div>
            <div class="dmx_form_item">
                <div class="item_label">初始統計</div>
                <div class="item_content"><input type="checkbox" id="import_initial"></div>
            </div>
            <div class="dmx_form_item" style="padding:5px 0 15px">
                <button class="dmx_button" id="upload_but">選擇文件...</button>
            </div>`
        })
        let butEl = $('upload_but')
        butEl.addEventListener('click', () => {
            let inp = document.createElement('input')
            inp.type = 'file'
            inp.accept = 'application/zip'
            inp.onchange = function () {
                let files = this.files
                if (files.length < 1) return
                let f = files[0]
                // if (f.type !== 'application/zip') return // windows 系統識別類型為 application/x-zip-compressed，從而導致 bug
                if (!f.type.includes('zip')) {
                    dal('請選擇正確的壓縮包文件！', 'error')
                    return
                }

                butEl.disabled = true
                butEl.innerText = '正在導入...'

                let tStart = new Date()
                let isClear = $('import_clear').checked
                let isInitial = $('import_initial').checked
                JSZip.loadAsync(f).then(async function (zip) {
                    // zip.forEach((filename, file) => console.log(filename, file)) // zip 詳情

                    let errStr = ''
                    let errNum = 0
                    let errAppend = (e) => {
                        errNum++
                        errStr += e + JSON.stringify(e) + '\n'
                    }

                    // mp3Type
                    let mp3TypeObj = {}
                    try {
                        let mp3Type = await zip.file('mp3Type.json').async('text')
                        mp3TypeObj = JSON.parse(mp3Type)
                    } catch (e) {
                        errAppend(e)
                    }

                    // cate
                    let cateArr = []
                    try {
                        let cate = await zip.file('cate.json').async('text')
                        cateArr = JSON.parse(cate)
                    } catch (e) {
                        errAppend(e)
                    }

                    // sentence
                    let sentenceNum = 0
                    let sentenceRepeat = 0 // 重複的句子
                    let sentenceArr = []
                    try {
                        let sentence = await zip.file('sentence.json').async('text')
                        sentenceArr = JSON.parse(sentence)
                    } catch (e) {
                        errAppend(e)
                    }

                    if (isClear) {
                        // 清空數據
                        db.clear('sentence').then(_ => debug('sentence clear finish.')).catch(e => errAppend(e))
                        db.clear('cate').then(_ => debug('cate clear ok.')).catch(e => errAppend(e))

                        // cate
                        for (let v of cateArr) db.create('cate', v).catch(e => errAppend(e))

                        // sentence
                        for (let v of sentenceArr) {
                            await zip.file(`mp3/${v.id}.mp3`).async('blob').then(b => {
                                v.blob = b.slice(0, b.size, mp3TypeObj[v.id] || 'audio/mpeg') // 設置 blob 類型
                            })
                            if (isInitial) {
                                v.records = 0
                                v.days = 0
                            }
                            await db.create('sentence', v).then(r => {
                                sentenceNum++
                                butEl.innerText = `正在導入... ${sentenceNum}/${sentenceArr.length}`
                                debug('sentence create:', v.id, r)
                            }).catch(e => errAppend(e))
                        }
                    } else {
                        // cate 對應表
                        let cateMap = {}
                        for (let v of cateArr) {
                            let row = null
                            await db.readByIndex('cate', 'cateName', v.cateName.trim()).then(r => row = r).catch(e => errAppend(e))
                            if (!row) {
                                // 不存在就創建
                                let oldId = v.cateId
                                delete v.cateId
                                await db.create('cate', v).then(r => {
                                    cateMap[oldId] = r.target.result // 對應新創建的ID
                                }).catch(e => errAppend(e))
                            } else {
                                cateMap[v.cateId] = row.cateId // 存在就記錄對應的ID
                            }
                        }

                        // sentence
                        for (let v of sentenceArr) {
                            // 判斷句子是否存在
                            let sentence = null
                            await db.readByIndex('sentence', 'sentence', v.sentence.trim()).then(r => sentence = r).catch(e => errAppend(e))
                            if (sentence) {
                                sentenceRepeat++
                                continue // 如果存在，就跳過
                            }

                            // 初始統計
                            if (isInitial) {
                                v.records = 0
                                v.days = 0
                            }

                            // 獲取音訊
                            await zip.file(`mp3/${v.id}.mp3`).async('blob').then(b => {
                                v.blob = b.slice(0, b.size, mp3TypeObj[v.id] || 'audio/mpeg') // 設置 blob 類型
                            })

                            // 寫入資料庫
                            v.cateId = cateMap[v.cateId] || 0
                            delete v.id
                            await db.create('sentence', v).then(r => {
                                sentenceNum++
                                butEl.innerText = `正在導入... ${sentenceNum}/${sentenceArr.length}`
                                debug('create sentenceId:', r.target.result)
                            }).catch(e => errAppend(e))
                        }
                    }

                    let okMsg = `導入完成<br> 導入：${sentenceNum} 條`
                    if (sentenceRepeat > 0) okMsg += `，重複：${sentenceRepeat} 條`
                    if (errNum > 0) {
                        okMsg += `，錯誤：${errNum} 次`
                        console.warn('errStr:', errStr)
                    }
                    okMsg += `<br>耗時：${new Date() - tStart} ms`
                    dal(okMsg, 'success', () => {
                        // location.reload()
                        removeDdi()
                        initCate(cateId)
                        initSentence(cateId)
                    })
                }).catch(e => {
                    dal('讀取壓縮包失敗', 'error', () => removeDdi())
                    debug('loadAsync error:', e)
                })
            }
            inp.click()
        })
    })
}

// 設置
function openSetting() {
    $('setting').addEventListener('click', function () {
        ddi({
            title: '設置', body: `<div class="dmx_form_item">
            <div class="item_label">展示順序</div>
                <div class="item_content number">
                    <select id="order_by">
                        <option value="obverse">正序</option>
                        <option value="reverse">倒序</option>
                        <option value="random">隨機</option>
                    </select>
                </div>
            </div>
            <div class="dmx_right">
                <button class="dmx_button" id="save_but">保存</button>
            </div>`
        })
        $('order_by').value = localStorage['orderBy'] || 'obverse'
        $('save_but').addEventListener('click', () => {
            localStorage.setItem('orderBy', $('order_by').value)
            removeDdi()
            initSentence(cateId)
        })
    })
}

// 全選/取消全選
function selectAll() {
    $('selectAll').addEventListener('click', function () {
        let eList = D('td.tb_checkbox input[type="checkbox"]')
        eList.forEach(el => el.checked = this.checked)
        ;(this.checked && eList.length > 0 ? addClass : rmClass)($('extra_but'), 'dmx_show')
    })
}

// 取消選中
function selectCancel() {
    $('selectAll').checked = false
    rmClass($('extra_but'), 'dmx_show')
}

// 隨機數組
function shuffle(arr) {
    for (let k = 0; k < arr.length; k++) {
        let i = Math.floor(Math.random() * arr.length);
        [arr[k], arr[i]] = [arr[i], arr[k]]
    }
    return arr
}
