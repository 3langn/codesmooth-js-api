import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../common/abstract.entity";
import { BalanceEntity } from "./balance.entity";
import { TransactionEntity } from "./transaction.entity";
import { TransactionType } from "../common/enum/transaction";
import { CourseEntity } from "./course.entity";
import { UserEntity } from "./user.entity";

@Entity("balance_histories")
export class BalanceHistoryEntity extends BaseEntity {
  @Column()
  current_balance: number;

  @Column()
  previous_balance: number;

  @Column()
  amount: number;

  @ManyToOne(() => BalanceEntity)
  @JoinColumn({ name: "balance_id" })
  balance: BalanceEntity;

  @Column({ enum: TransactionType, nullable: true })
  type: TransactionType;

  @Column()
  balance_id: number;

  @ManyToOne(() => TransactionEntity)
  @JoinColumn({ name: "transaction_id" })
  transaction: TransactionEntity;

  @Column()
  transaction_id: string;

  @ManyToOne(() => CourseEntity)
  @JoinColumn({ name: "course_id" })
  course: CourseEntity;

  @Column({ nullable: true })
  course_id: number;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: "user_id" })
  user: UserEntity;

  @Column({ nullable: true })
  user_id: number;
}
