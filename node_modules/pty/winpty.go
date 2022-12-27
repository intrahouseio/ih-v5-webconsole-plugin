package main

import (
    "strconv"
    "fmt"
    "os"
    "bufio"
    "bytes"
    "unicode/utf8"
    "github.com/iamacarpet/go-winpty"
)

var addrFlag, cmdFlag, staticFlag string


func write(pty *winpty.WinPTY) {
    buf := make([]byte, 8192)
    reader := bufio.NewReader(os.Stdin)
    var buffer bytes.Buffer

    for {
        n, err := reader.Read(buf)
        if err != nil {
            
            fmt.Println(err)
            os.Exit(1)
            return
        }
      
        bufferBytes := buffer.Bytes()
        runeReader := bufio.NewReader(bytes.NewReader(append(bufferBytes[:],buf[:n]...)))
        buffer.Reset()
        i := 0
        for i < n {
            char, charLen, e := runeReader.ReadRune()
            if e != nil {
                fmt.Println(err)
                os.Exit(1)
                return
            }
            if char == utf8.RuneError {
                runeReader.UnreadRune()
                break
            }
            i += charLen
            buffer.WriteRune(char)
        }

        pty.StdIn.Write(buffer.Bytes());
     
        buffer.Reset()
        if i < n {
            buffer.Write(buf[i:n])
        }
    }
}

func read(pty *winpty.WinPTY) {
    buf := make([]byte, 8192)
    reader := bufio.NewReader(pty.StdOut)
    var buffer bytes.Buffer

    for {
        n, err := reader.Read(buf)
        if err != nil {
            fmt.Println(err)
            os.Exit(1)
            return
        }
      
        bufferBytes := buffer.Bytes()
        runeReader := bufio.NewReader(bytes.NewReader(append(bufferBytes[:],buf[:n]...)))
        buffer.Reset()
        i := 0
        for i < n {
            char, charLen, e := runeReader.ReadRune()
            if e != nil {
                fmt.Println(err)
                os.Exit(1)
                return
            }
            if char == utf8.RuneError {
                runeReader.UnreadRune()
                break
            }
            i += charLen
            buffer.WriteRune(char)
        }

        os.Stdout.Write(buffer.Bytes())
     
        buffer.Reset()
        if i < n {
            buffer.Write(buf[i:n])
        }
    }
}

func init() {

}

func main() {
    var pty *winpty.WinPTY
    var err error

    pty, err = winpty.OpenDefault ("", "powershell")
    if err != nil {
        fmt.Println(err)
        os.Exit(1)
    }



    a1, err := strconv.ParseInt(os.Args[1], 10, 32)
    arg1 := uint32(a1)

    a2, err := strconv.ParseInt(os.Args[2], 10, 32)
    arg2 := uint32(a2)

    pty.SetSize(arg1, arg2)

    go read(pty)
    go write(pty)
    select{}
}
