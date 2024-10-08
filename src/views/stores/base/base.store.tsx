/**
 * @fileOverview base store, all store muse extends this store
 * @date 2023-04-12
 * @author poohlaha
 */
import { action, observable } from 'mobx'
import { SYSTEM } from '@config/index'
import { COMMON, TOAST } from '@utils/base'
import Utils from '@utils/utils'
import SmCrypto from 'sm-crypto'
import { HttpRequest } from '@bale-web/request'

export default class BaseStore {
  @observable loading: boolean = false
  readonly tokenName: string = 'token'
  readonly DOMAIN_PORT_REG = /^https?:\/\/[^\\/]+\/([^?#]+(\?[^#]*)?)?/

  readonly SUFFIXS: Array<string> = [
    'jpeg',
    'jpg',
    'png',
    'gif',
    'tiff',
    'tif',
    'webp',
    'ico',
    'heic',
    'dxf',
    'eps',
    'pcx',
    'wmf',
    'exif',
    'raw',
    'cgm',
    'svg',
    'cdr',
    'tga',
    'bmp',
    'psd',
    'emf',
    'swf',
    'pdf',
    'lic',
    'txt',
    'doc',
    'docx',
    'xlsx',
    'ppt',
    'pptx',
    'ofd',
  ]

  /**
   * 获取相对路径
   */
  @action
  getRelativePath(url: string = '') {
    if (Utils.isBlank(url)) return ''
    const match = url.match(this.DOMAIN_PORT_REG)
    if (match) {
      let matchUrl = match[1] || ''
      if (matchUrl.startsWith('/')) {
        return matchUrl
      }

      return `/${matchUrl}`
    }

    return url || ''
  }

  /**
   * 设置属性
   */
  @action
  setProperty = (property: any, value: any) => {
    // @ts-ignore
    this[property] = value
  }

  /**
   * 获取属性
   */
  @action
  getProperty = (property: any) => {
    // @ts-ignore
    return this[property]
  }

  /**
   * 发送请求
   * options: {
   *   url: '',
   *   success: () -> {},
   *   fail: () => {}
   * }
   */
  async send(options: { [K: string]: any } = {}, needSend: boolean = true, headers: { [K: string]: any } = {}) {
    if (Utils.isObjectNull(options)) {
      console.warn('options is empty !')
      return
    }

    if (Utils.isBlank(options.url)) {
      console.warn('url is empty !')
      return
    }

    let requestUrl = options.url || ''
    if (!requestUrl.startsWith('https://') && !requestUrl.startsWith('http://')) {
      requestUrl = process.env.API_ROOT + requestUrl
    }

    let token = Utils.getLocal(SYSTEM.LOCAL_TOKEN_NAME)
    let requestHeaders = {}
    if (!Utils.isObjectNull(headers)) {
      requestHeaders = headers
    }

    let type = options.responseStream ? '3' : '0'
    let params: any = {
      url: requestUrl,
      data: {
        requestId: Utils.generateUUID(),
        requestTime: Utils.formatDateStr(new Date(), 'yyyyMMddHHmmss'),
        data: {
          ...options.data,
        },
      },
      headers: {
        [this.tokenName]: token || '',
        ...requestHeaders,
      },
      success: (data: any = {}) => {
        if (type !== '0') {
          return options.success?.(data.body || null)
        }

        let body = data.body || {}
        if (body.code !== '0' && body.code !== 0) {
          // token 过期
          if (body.code === SYSTEM.TOKEN_EXPIRED_CODE) {
            /*
            TOAST.show({
              message: COMMON.getLanguageText('TOKEN_EXPIRED_ERROR'),
              type: 2
            })
             */
          } else {
            let whenCodeNoZeroOpenDialog = options.whenCodeNoZeroOpenDialog
            if (whenCodeNoZeroOpenDialog === null || whenCodeNoZeroOpenDialog === undefined) {
              whenCodeNoZeroOpenDialog = true
            }
            if (whenCodeNoZeroOpenDialog) {
              TOAST.show({
                message: COMMON.getLanguageText('ERROR_MESSAGE'),
                type: 4,
              })
            }
          }

          return options.fail?.(body || {})
        }

        return options.success?.(body.data || {}, body)
      },
      failed: async (res: any = {}) => {
        if (res.code === SYSTEM.TOKEN_EXPIRED_CODE) {
          // await this.getLoginUrl()
        } else {
          options.fail?.(res)
        }
      },
      type: '0',
      responseType: type,
    }

    return needSend ? await HttpRequest.send(params) : params
  }

  // 下载pdf
  @action
  exportPdf(data: any, fileName: string) {
    if (!data) return
    let blob = new Blob([data || ''], { type: 'application/pdf' })
    let a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = fileName || ''
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  exportFile(url: string, fileName: string) {
    if (Utils.isBlank(url)) return

    let newFileName = ''
    if (Utils.isBlank(fileName) || fileName.indexOf('.') === -1) {
      let urls = url.split('/') || []
      if (urls.length > 0) {
        newFileName = urls[urls.length - 1]
      } else {
        newFileName = fileName || ''
      }
    } else {
      newFileName = fileName || ''
    }

    const download = (url: any) => {
      let a = document.createElement('a')
      a.href = url || ''
      a.download = newFileName || ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    let suffixS = newFileName.split('.') || []
    let suffix = ''
    if (suffixS.length >= 2) {
      suffix = suffixS[suffixS.length - 1] || ''
      suffix = suffix.toLowerCase()
    }

    if (this.SUFFIXS.indexOf(suffix) !== -1) {
      let xhr = new XMLHttpRequest()
      xhr.responseType = 'blob'
      xhr.onload = () => {
        let data = xhr.response
        let blob = new Blob([data || ''], { type: `application/${suffix}` })
        download(URL.createObjectURL(blob))
      }

      xhr.open('GET', url, true)
      xhr.send()
    } else {
      download(url)
    }
  }
}
