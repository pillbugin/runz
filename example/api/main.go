package main

import (
    "fmt"
    "math/rand"
    "time"
)

func main() {
    fmt.Println("Starting API Server...")
    rand.Seed(time.Now().UnixNano())
    interval := time.Duration(rand.Intn(3)+1) * time.Second

    for {
        fmt.Println("Handling API request")
        time.Sleep(interval)
    }
}
