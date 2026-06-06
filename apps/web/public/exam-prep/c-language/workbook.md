# C언어 예상문제집 v1

## 출제유력 범위 요약
컴퓨터개론은 아직 공지 대기 중이므로, 현재 확보된 자료 기준으로 먼저 만든 로컬 학습 산출물입니다.

## 선행 개념 정리
아래 정리와 풀이 문항을 먼저 보고, 시험 직전에는 표/진리표/비교표/코드 작성형만 반복합니다.

## 참고자료 풀이

# C언어 기말 참고자료 풀이

기준 자료: `기말고사 참고자료(2026).pdf`

## 1. 홀수만 출력하기

빈칸 A:

```c
continue;
```

이유: `i`가 짝수이면 아래 `printf`를 건너뛰어야 하므로 `continue`를 쓴다.

출력:

```text
1 3 5 7 9
```

## 2. 에러 원인, 수정, 출력

원인:
- `Max` 함수는 인자 3개를 받는데 `Max(3, 4)`처럼 2개만 전달했다.
- `main` 안의 지역변수 `max`가 전역변수 `max`를 가린다.
- `Max`의 반환값을 `main`의 지역변수 `max`에 저장하지 않았다.

수정 예:

```c
#include <stdio.h>

int Max(int a, int b, int c)
{
    int max;
    max = a > b ? a : b;
    max = max > c ? max : c;
    return max;
}

int main(void)
{
    int max = 0;
    max = Max(3, 4, 5);
    printf("가장 큰 수는 %d입니다.", max);
    return 0;
}
```

출력:

```text
가장 큰 수는 5입니다.
```

## 3. swap 결과 예측

`swap(int x, int y)`는 값을 복사해서 받는 call by value 함수다. 함수 안에서 `x`, `y`가 바뀌어도 `main`의 `c`, `d`는 바뀌지 않는다.

출력:

```text
swap 전의 c = 10, d=20
swap 후의 c = 10, d=20
```

## 4. 배열 선언 O/X

| 번호 | 코드 | 답 | 이유 |
|---:|---|---|---|
| 1 | `double arr[0];` | X | 표준 C에서 크기 0 배열은 올바른 선언이 아니다. |
| 2 | `int brr[a];` | X | `a`가 선언/초기화되어 있지 않다. |
| 3 | `short crr[] = {1, 2, 3, 4, 5};` | O | 초기값 개수로 배열 크기를 결정한다. |
| 4 | `int drr[4] = {1, 2, 3, 10, 15};` | X | 크기 4 배열에 초기값 5개를 넣었다. |
| 5 | `float krr[5] = {0.0};` | O | 첫 원소는 0.0, 나머지도 0으로 초기화된다. |

## 5. 입력받은 정수까지 합계

빈칸:
- 함수 원형: `int sum(int a);`
- 함수 정의: `int sum(int a)`
- B: `return num`

전체 코드:

```c
#include <stdio.h>

int Input(void);
int sum(int a);

int main(void)
{
    int num;
    printf("한 개의 정수를 입력하세요 : ");
    num = Input();

    printf("%d 까지의 합계 : %d \n", num, sum(num));
    return 0;
}

int Input(void)
{
    int num;
    scanf("%d", &num);
    return num;
}

int sum(int a)
{
    int i, hap = 0;
    for (i = 1; i <= a; i++) {
        hap += i;
    }
    return hap;
}
```

## 6. 배열 전체 복사 오류

잘못된 라인:

```c
07: brr = arr;
```

이유:
- C에서 배열 이름은 대입 가능한 변수가 아니다.
- 배열 전체를 `=`로 복사할 수 없고, 반복문으로 원소별 복사해야 한다.

수정:

```c
for (i = 0; i < 5; i++) {
    brr[i] = arr[i];
}
```

## 7. # 피라미드 출력

출력 모양:

```text
     #
    # #
   # # #
  # # # #
 # # # # #
# # # # # #
```

빈칸 예:

```c
for (j = 1; j <= 6 - i; j++) {
    printf(" ");
}
for (k = 1; k <= i; k++) {
    printf("# ");
}
printf("\n");
```

전체 구조:

```c
#include <stdio.h>

int main(void)
{
    int i, j, k;

    for (i = 1; i <= 6; i++) {
        for (j = 1; j <= 6 - i; j++) {
            printf(" ");
        }
        for (k = 1; k <= i; k++) {
            printf("# ");
        }
        printf("\n");
    }

    return 0;
}
```

## 8. AAA 함수 작성

```c
#include <stdio.h>

int AAA(int x);

int main(void)
{
    int x;

    scanf("%d", &x);
    printf("홀수의 합 : %d \n", AAA(x));
    return 0;
}

int AAA(int x)
{
    int i, sum = 0;

    for (i = 1; i <= x; i++) {
        if (i % 2 == 1) {
            sum += i;
        }
    }

    return sum;
}
```

## 9. 지역변수와 static

원래 출력:

```text
num = 0 num = 0 num = 0
```

이유: `Testlocal`을 호출할 때마다 지역변수 `num`이 새로 만들어지고 0으로 초기화된다.

수정:

```c
#include <stdio.h>

void Testlocal(void)
{
    static int num = 0;
    printf("num = %d ", num++);
}

int main(void)
{
    Testlocal();
    Testlocal();
    Testlocal();
    return 0;
}
```

수정 후 출력:

```text
num = 0 num = 1 num = 2
```

## 10. 블록 스코프와 전역변수

PDF 코드 그대로라면 `void test(void)` 뒤에 세미콜론이 없어서 컴파일 오류가 난다.

의도대로라면 다음처럼 보아야 한다.

```c
void test(void);
double x = 0.01;
```

이 경우 출력:

```text
in while block: x = 1.230000
in while block: x = 0.500000
in while block: x = 0.100000
```

이유:
- while 블록 안의 `double x = 1.23`은 블록 지역변수다.
- while 밖 main의 `x`는 `0.5`다.
- `test` 함수의 `x`는 전역변수 `0.01`을 사용하고, `x *= 10`으로 `0.1`이 된다.

## 11. 홀수/짝수 판별

조건: 한 개의 정수는 `AAA` 함수에서 입력받고, 출력은 `main`에서 처리한다.

```c
#include <stdio.h>

int AAA(void);

int main(void)
{
    int num;

    num = AAA();
    if (num % 2 == 0) {
        printf("짝수\n");
    } else {
        printf("홀수\n");
    }

    return 0;
}

int AAA(void)
{
    int num;
    scanf("%d", &num);
    return num;
}
```

## 12. 원의 넓이

```c
#include <stdio.h>

int Input(void);
double circle(int r);

int main(void)
{
    int r;
    double area;

    r = Input();
    area = circle(r);
    printf("원의 넓이 : %.2f\n", area);

    return 0;
}

int Input(void)
{
    int r;
    scanf("%d", &r);
    return r;
}

double circle(int r)
{
    return 3.14 * r * r;
}
```

## 13. 이중 while문 구구단

```c
#include <stdio.h>

int main(void)
{
    int i = 1;
    int dan;

    while (i <= 9) {
        dan = 2;
        while (dan <= 9) {
            printf("%d * %d = %2d\t", dan, i, dan * i);
            dan++;
        }
        printf("\n");
        i++;
    }

    return 0;
}
```

## 14. 3개의 정수 중 최댓값

```c
#include <stdio.h>

int max(int a, int b, int c);

int main(void)
{
    int a, b, c;
    int result;

    scanf("%d %d %d", &a, &b, &c);
    result = max(a, b, c);
    printf("가장 큰 수 : %d\n", result);

    return 0;
}

int max(int a, int b, int c)
{
    int result;

    result = a > b ? a : b;
    result = result > c ? result : c;

    return result;
}
```

## 15. 배열로 총점과 평균

```c
#include <stdio.h>

int main(void)
{
    int score[5];
    int i, sum = 0;
    double avg;

    for (i = 0; i < 5; i++) {
        scanf("%d", &score[i]);
        sum += score[i];
    }

    avg = sum / 5.0;

    printf("총점 : %d\n", sum);
    printf("평균 : %.2f\n", avg);

    return 0;
}
```

## 16. 배열 복사

### main 함수만 사용

```c
#include <stdio.h>

int main(void)
{
    int A[5] = {10, 20, 30, 40, 50};
    int B[5];
    int i;

    for (i = 0; i < 5; i++) {
        B[i] = A[i];
    }

    for (i = 0; i < 5; i++) {
        printf("%d ", B[i]);
    }

    return 0;
}
```

### copy_arr 함수 사용

```c
#include <stdio.h>

void copy_arr(int dest[], int src[], int size);

int main(void)
{
    int A[5] = {10, 20, 30, 40, 50};
    int B[5];
    int i;

    copy_arr(B, A, 5);

    for (i = 0; i < 5; i++) {
        printf("%d ", B[i]);
    }

    return 0;
}

void copy_arr(int dest[], int src[], int size)
{
    int i;

    for (i = 0; i < size; i++) {
        dest[i] = src[i];
    }
}
```

## 17. 연습문제 체크리스트

PDF에 적힌 추가 범위:
- 각 장의 O/X 문제
- 5장: 3, 6, 8, 10, 13, 20
- 6장: 15, 17, 20
- 7장: 11, 12, 13, 15, 16
- 지역변수와 전역변수의 차이점

지역변수/전역변수 핵심:
- 지역변수는 선언된 블록 안에서만 사용된다.
- 지역변수는 함수 호출 때 만들어지고 함수가 끝나면 사라진다.
- 전역변수는 함수 밖에 선언되고 프로그램 전체에서 접근 가능하다.
- 같은 이름이면 지역변수가 전역변수를 가린다.
- 전역변수 남용은 함수 간 의존성을 키우므로 시험 코드에서는 반환값과 매개변수를 우선 사용한다.
