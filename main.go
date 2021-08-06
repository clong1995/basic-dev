package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"github.com/webview/webview"
	"io/ioutil"
	"log"
	"net/http"
	"strings"
)

var address string
var token string
var accessKeyID []byte
var contentHmac = "Content-Hmac"

//var url = "https://jyyf.tech/dev-tool"
var url = "http://localhost:63341/app/assets/index.html"

func main() {
	w := webview.New(false)
	defer w.Destroy()

	w.SetTitle("dev tool")
	w.SetSize(1024, 768, webview.HintNone) //默认
	w.SetSize(1024, 768, webview.HintMin)  //最小
	//w.SetSize(1920, 1080, webview.HintMax)//最大
	w.Navigate(url)

	//初始化
	if err := w.Bind("Initialize", initialize); err != nil {
		log.Println(err)
		return
	}
	//ajax
	if err := w.Bind("Ajax", ajax); err != nil {
		log.Println(err)
		return
	}
	//log
	if err := w.Bind("Log", goLog); err != nil {
		log.Println(err)
		return
	}

	w.Run()
}

func initialize(addr, t, ak string) {
	address = addr
	token = t
	accessKeyID = []byte(ak)
}

func ajax(uri, jsonStr string) string {
	if !strings.HasPrefix(uri, "http") {
		uri = address + uri
	}
	//拼装json
	if jsonStr == "{}" {
		jsonStr = fmt.Sprintf(`{"t":"%s","d":"dev tool"}`, token)
	} else {
		jsonStr = fmt.Sprintf(`{"t":"%s","d":"",%s`, token, strings.TrimPrefix(jsonStr, "{"))
	}
	signature := ""
	if token != "" && accessKeyID != nil && len(accessKeyID) != 0 {
		//计算数据签名
		signature = hmacSha256([]byte(jsonStr), accessKeyID)
	}

	//发送请求
	client := http.Client{}
	req, err := http.NewRequest("POST", uri, bytes.NewBuffer([]byte(jsonStr)))
	if err != nil {
		log.Println(err)
		return responseErr(err)
	}
	req.Header = http.Header{
		"User-Agent":   []string{"dev tool"},
		"Content-Hmac": []string{signature},
	}
	res, err := client.Do(req)
	/*res, err := http.Post(uri,
		"application/json; charset=utf-8",
		bytes.NewBuffer([]byte(jsonStr)),
	)*/
	if err != nil {
		log.Println(err)
		return responseErr(err)
	}
	defer res.Body.Close()

	//读取内容
	content, err := ioutil.ReadAll(res.Body)
	if err != nil {
		log.Println(err)
		return responseErr(err)
	}

	//校验签名
	sig := res.Header.Get(contentHmac)
	if sig != "" {
		if !checkHmacSha256(content, sig, accessKeyID) {
			log.Println(err)
			return responseErr(err)
		}
	}

	return string(content)
}

func checkHmacSha256(message []byte, messageMAC string, key []byte) bool {
	return messageMAC == hmacSha256(message, key)
}

func hmacSha256(message []byte, key []byte) string {
	mac := hmac.New(sha256.New, key)
	mac.Write(message)
	expectedMAC := mac.Sum(nil)
	return hex.EncodeToString(expectedMAC)
}

func responseErr(err error) string {
	return fmt.Sprintf(`{"state":"%s","data":null}`, err)
}

func goLog(str string) {
	log.Println(str)
}
